import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { BetId, MarketId, UserId } from "@yoda.fun/shared/typeid";
import type { ActivityService } from "./activity-service";
import type { LeaderboardService } from "./leaderboard-service";

type SettlementServiceDeps = {
  db: Database;
  logger: Logger;
  leaderboardService?: LeaderboardService;
  activityService?: ActivityService;
};

type MarketResult = "YES" | "NO" | "INVALID";

type ResolutionMetadata = {
  sources?: Array<{ url: string; snippet: string; publishedAt?: string }>;
  confidence?: number;
  aiModelUsed?: string;
};

export function createSettlementService({
  deps,
}: {
  deps: SettlementServiceDeps;
}) {
  const { db, logger, leaderboardService, activityService } = deps;

  /**
   * Process a single winning bet within a transaction
   */
  async function processWinningBetInTx(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    bet: { id: BetId; userId: UserId; amount: string },
    payout: number,
    marketId: MarketId
  ) {
    await tx
      .update(DB_SCHEMA.bet)
      .set({
        status: "WON",
        payout: payout.toFixed(2),
        settlementStatus: "SETTLED",
        settledAt: new Date(),
      })
      .where(eq(DB_SCHEMA.bet.id, bet.id));

    await tx
      .update(DB_SCHEMA.userBalance)
      .set({
        availableBalance: sql`${DB_SCHEMA.userBalance.availableBalance} + ${payout.toFixed(2)}`,
      })
      .where(eq(DB_SCHEMA.userBalance.userId, bet.userId));

    await tx.insert(DB_SCHEMA.transaction).values({
      userId: bet.userId,
      type: "PAYOUT",
      amount: payout.toFixed(2),
      status: "COMPLETED",
      metadata: {
        marketId,
        betId: bet.id,
        originalBet: Number(bet.amount),
      },
    });
  }

  /**
   * Process a single losing bet within a transaction
   */
  async function processLosingBetInTx(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    betId: BetId
  ) {
    await tx
      .update(DB_SCHEMA.bet)
      .set({
        status: "LOST",
        payout: "0.00",
        settlementStatus: "SETTLED",
        settledAt: new Date(),
      })
      .where(eq(DB_SCHEMA.bet.id, betId));
  }

  /**
   * Track stats and log activity for a settled bet
   */
  async function trackBetOutcome(options: {
    userId: UserId;
    won: boolean;
    profit: number;
    marketId: MarketId;
    marketTitle: string;
    payout: number;
  }) {
    const { userId, won, profit, marketId, marketTitle, payout } = options;
    if (leaderboardService) {
      const streakResult = await leaderboardService.updateStatsOnSettlement({
        userId,
        won,
        profit,
      });

      if (activityService && won && streakResult) {
        await activityService.logStreakMilestone({
          userId,
          streakCount: streakResult.newCurrentStreak,
        });
      }
    }

    if (activityService) {
      await activityService.logBetResult({
        userId,
        marketId,
        marketTitle,
        won,
        payout,
      });
    }
  }

  return {
    /**
     * Resolve a market with a result
     * This sets the outcome and triggers settlement
     */
    async resolveMarket(
      marketId: MarketId,
      result: MarketResult,
      metadata?: ResolutionMetadata
    ) {
      // Get the market
      const marketRecords = await db
        .select()
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, marketId))
        .limit(1);

      const market = marketRecords[0];
      if (!market) {
        throw new Error("Market not found");
      }

      if (market.result) {
        throw new Error("Market already resolved");
      }

      // Update market with result
      await db
        .update(DB_SCHEMA.market)
        .set({
          result,
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolutionSources: metadata?.sources,
          resolutionConfidence: metadata?.confidence,
          aiModelUsed: metadata?.aiModelUsed,
        })
        .where(eq(DB_SCHEMA.market.id, marketId));

      logger.info(
        { marketId, result, confidence: metadata?.confidence },
        "Market resolved"
      );

      // Settle the market
      await this.settleMarket(marketId, result);

      return { marketId, result };
    },

    /**
     * Settle all bets on a resolved market
     * Calculates payouts using parimutuel system
     */
    async settleMarket(marketId: MarketId, result: MarketResult) {
      // Get all active bets for this market
      const bets = await db
        .select()
        .from(DB_SCHEMA.bet)
        .where(
          and(
            eq(DB_SCHEMA.bet.marketId, marketId),
            eq(DB_SCHEMA.bet.status, "ACTIVE")
          )
        );

      if (bets.length === 0) {
        logger.info({ marketId }, "No bets to settle");
        return { settled: 0, totalPayout: 0 };
      }

      // Calculate totals
      const totalPool = bets.reduce((sum, bet) => sum + Number(bet.amount), 0);
      const winningVote = result === "INVALID" ? null : result;

      // If INVALID, refund everyone
      if (result === "INVALID") {
        return this.refundAllBets(marketId, bets);
      }

      const winningBets = bets.filter((bet) => bet.vote === winningVote);
      const losingBets = bets.filter((bet) => bet.vote !== winningVote);

      // If no winners, refund everyone
      if (winningBets.length === 0) {
        logger.info({ marketId }, "No winners, refunding all bets");
        return this.refundAllBets(marketId, bets);
      }

      const totalWinningAmount = winningBets.reduce(
        (sum, bet) => sum + Number(bet.amount),
        0
      );

      // Settle in a transaction
      const result_data = await db.transaction(async (tx) => {
        let totalPayout = 0;

        for (const bet of winningBets) {
          const betAmount = Number(bet.amount);
          const payout = (betAmount / totalWinningAmount) * totalPool;
          totalPayout += payout;
          await processWinningBetInTx(tx, bet, payout, marketId);
        }

        for (const bet of losingBets) {
          await processLosingBetInTx(tx, bet.id);
        }

        return { settled: bets.length, totalPayout };
      });

      logger.info(
        {
          marketId,
          winners: winningBets.length,
          losers: losingBets.length,
          totalPool,
          totalPayout: result_data.totalPayout,
        },
        "Market settled"
      );

      // Get market title for activity logging
      const marketRecords = await db
        .select({ title: DB_SCHEMA.market.title })
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, marketId))
        .limit(1);
      const marketTitle = marketRecords[0]?.title ?? "Unknown market";

      // Track stats and log activities for all bets
      for (const bet of winningBets) {
        const betAmount = Number(bet.amount);
        const payout = (betAmount / totalWinningAmount) * totalPool;
        await trackBetOutcome({
          userId: bet.userId,
          won: true,
          profit: payout - betAmount,
          marketId,
          marketTitle,
          payout,
        });
      }

      for (const bet of losingBets) {
        const betAmount = Number(bet.amount);
        await trackBetOutcome({
          userId: bet.userId,
          won: false,
          profit: -betAmount,
          marketId,
          marketTitle,
          payout: 0,
        });
      }

      return result_data;
    },

    /**
     * Refund all bets on a market (used for INVALID result or no winners)
     */
    async refundAllBets(
      marketId: MarketId,
      bets: Array<{
        id: BetId;
        userId: UserId;
        amount: string;
      }>
    ) {
      let totalRefunded = 0;

      await db.transaction(async (tx) => {
        for (const bet of bets) {
          const amount = Number(bet.amount);
          totalRefunded += amount;

          // Update bet status
          await tx
            .update(DB_SCHEMA.bet)
            .set({
              status: "REFUNDED",
              payout: bet.amount, // Refund original amount
              settlementStatus: "SETTLED",
              settledAt: new Date(),
            })
            .where(eq(DB_SCHEMA.bet.id, bet.id));

          // Credit user's balance
          await tx
            .update(DB_SCHEMA.userBalance)
            .set({
              availableBalance: sql`${DB_SCHEMA.userBalance.availableBalance} + ${amount.toFixed(2)}`,
            })
            .where(eq(DB_SCHEMA.userBalance.userId, bet.userId));

          // Create refund transaction
          await tx.insert(DB_SCHEMA.transaction).values({
            userId: bet.userId,
            type: "REFUND",
            amount: amount.toFixed(2),
            status: "COMPLETED",
            metadata: {
              marketId,
              betId: bet.id,
              reason: "INVALID_MARKET",
            },
          });
        }
      });

      logger.info(
        { marketId, refunded: bets.length, totalRefunded },
        "All bets refunded"
      );

      return { settled: bets.length, totalPayout: totalRefunded };
    },

    /**
     * Get markets that need resolution (past deadline, not resolved)
     */
    async getMarketsToResolve() {
      const now = new Date();

      const markets = await db
        .select()
        .from(DB_SCHEMA.market)
        .where(
          and(
            eq(DB_SCHEMA.market.status, "ACTIVE"),
            sql`${DB_SCHEMA.market.resolutionDeadline} <= ${now}`
          )
        );

      return markets;
    },
  };
}

export type SettlementService = ReturnType<typeof createSettlementService>;
