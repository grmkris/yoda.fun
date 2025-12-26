import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { BetId, MarketId, UserId } from "@yoda.fun/shared/typeid";
import type { LeaderboardService } from "./leaderboard-service";

interface SettlementServiceDeps {
  db: Database;
  logger: Logger;
  leaderboardService?: LeaderboardService;
}

type MarketResult = "YES" | "NO" | "INVALID";

interface ResolutionMetadata {
  sources?: Array<{ url: string; snippet: string }>;
  confidence?: number;
}

export function createSettlementService({
  deps,
}: {
  deps: SettlementServiceDeps;
}) {
  const { db, logger, leaderboardService } = deps;

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

  async function trackBetOutcome(options: {
    userId: UserId;
    won: boolean;
    profit: number;
  }) {
    const { userId, won, profit } = options;
    if (leaderboardService) {
      await leaderboardService.updateStatsOnSettlement({
        userId,
        won,
        profit,
      });
    }
  }

  return {
    async resolveMarket(
      marketId: MarketId,
      result: MarketResult,
      metadata?: ResolutionMetadata
    ) {
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

      await db
        .update(DB_SCHEMA.market)
        .set({
          result,
          status: "SETTLED",
          resolvedAt: new Date(),
          resolutionSources: metadata?.sources,
          resolutionConfidence: metadata?.confidence,
        })
        .where(eq(DB_SCHEMA.market.id, marketId));

      logger.info(
        { marketId, result, confidence: metadata?.confidence },
        "Market resolved"
      );

      await this.settleMarket(marketId, result);

      return { marketId, result };
    },

    async settleMarket(marketId: MarketId, result: MarketResult) {
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

      const totalPool = bets.reduce((sum, bet) => sum + Number(bet.amount), 0);
      const winningVote = result === "INVALID" ? null : result;

      if (result === "INVALID") {
        return this.refundAllBets(marketId, bets);
      }

      const winningBets = bets.filter((bet) => bet.vote === winningVote);
      const losingBets = bets.filter((bet) => bet.vote !== winningVote);

      if (winningBets.length === 0) {
        logger.info({ marketId }, "No winners, refunding all bets");
        return this.refundAllBets(marketId, bets);
      }

      const totalWinningAmount = winningBets.reduce(
        (sum, bet) => sum + Number(bet.amount),
        0
      );

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

      for (const bet of winningBets) {
        const betAmount = Number(bet.amount);
        const payout = (betAmount / totalWinningAmount) * totalPool;
        await trackBetOutcome({
          userId: bet.userId,
          won: true,
          profit: payout - betAmount,
        });
      }

      for (const bet of losingBets) {
        const betAmount = Number(bet.amount);
        await trackBetOutcome({
          userId: bet.userId,
          won: false,
          profit: -betAmount,
        });
      }

      return result_data;
    },

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

          await tx
            .update(DB_SCHEMA.bet)
            .set({
              status: "REFUNDED",
              payout: bet.amount,
              settlementStatus: "SETTLED",
              settledAt: new Date(),
            })
            .where(eq(DB_SCHEMA.bet.id, bet.id));

          await tx
            .update(DB_SCHEMA.userBalance)
            .set({
              availableBalance: sql`${DB_SCHEMA.userBalance.availableBalance} + ${amount.toFixed(2)}`,
            })
            .where(eq(DB_SCHEMA.userBalance.userId, bet.userId));

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

    async getMarketsToResolve() {
      const now = new Date();

      const markets = await db
        .select()
        .from(DB_SCHEMA.market)
        .where(
          and(
            eq(DB_SCHEMA.market.status, "LIVE"),
            sql`${DB_SCHEMA.market.resolutionDeadline} <= ${now}`
          )
        );

      return markets;
    },
  };
}

export type SettlementService = ReturnType<typeof createSettlementService>;
