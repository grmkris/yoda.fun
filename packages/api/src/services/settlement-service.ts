import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { ResolutionMetadata } from "@yoda.fun/shared/resolution-types";
import type { BetId, MarketId, UserId } from "@yoda.fun/shared/typeid";
import type { LeaderboardService } from "./leaderboard-service";
import { VOTE_COST } from "./points-service";
import type { RewardService } from "./reward-service";

interface SettlementServiceDeps {
  db: Database;
  logger: Logger;
  leaderboardService?: LeaderboardService;
  rewardService?: RewardService;
}

type MarketResult = "YES" | "NO" | "INVALID";

export function createSettlementService({
  deps,
}: {
  deps: SettlementServiceDeps;
}) {
  const { db, logger, leaderboardService, rewardService } = deps;

  /**
   * Process a winning bet - credit fixed 3 points
   */
  async function processWinningBetInTx(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    bet: { id: BetId; userId: UserId; pointsSpent: number },
    marketId: MarketId
  ) {
    const pointsReturned = VOTE_COST; // Fixed 3 points for correct prediction

    await tx
      .update(DB_SCHEMA.bet)
      .set({
        status: "WON",
        pointsReturned,
        settlementStatus: "SETTLED",
        settledAt: new Date(),
      })
      .where(eq(DB_SCHEMA.bet.id, bet.id));

    await tx
      .update(DB_SCHEMA.userBalance)
      .set({
        points: sql`${DB_SCHEMA.userBalance.points} + ${pointsReturned}`,
      })
      .where(eq(DB_SCHEMA.userBalance.userId, bet.userId));

    await tx.insert(DB_SCHEMA.transaction).values({
      userId: bet.userId,
      type: "PAYOUT",
      points: pointsReturned,
      status: "COMPLETED",
      metadata: {
        marketId,
        betId: bet.id,
        pointsSpent: bet.pointsSpent,
      },
    });

    return pointsReturned;
  }

  /**
   * Process a losing bet - no payout
   */
  async function processLosingBetInTx(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    betId: BetId
  ) {
    await tx
      .update(DB_SCHEMA.bet)
      .set({
        status: "LOST",
        pointsReturned: 0,
        settlementStatus: "SETTLED",
        settledAt: new Date(),
      })
      .where(eq(DB_SCHEMA.bet.id, betId));
  }

  /**
   * Track bet outcome for leaderboard and rewards
   */
  async function trackBetOutcome(options: { userId: UserId; won: boolean }) {
    const { userId, won } = options;
    if (leaderboardService) {
      // Points-based: no profit tracking, just win/loss
      const result = await leaderboardService.updateStatsOnSettlement({
        userId,
        won,
        profit: 0, // No profit in points model
      });

      if (won && rewardService && result.newCurrentStreak > 0) {
        try {
          await rewardService.processWinStreakBonus(
            userId,
            result.newCurrentStreak
          );
        } catch (error) {
          logger.error(
            { error, userId },
            "Failed to process win streak reward"
          );
        }
      }
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
          resolutionReasoning: metadata?.reasoning,
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
      // Get all active bets (exclude SKIPs - they don't settle)
      const bets = await db
        .select()
        .from(DB_SCHEMA.bet)
        .where(
          and(
            eq(DB_SCHEMA.bet.marketId, marketId),
            eq(DB_SCHEMA.bet.status, "ACTIVE")
          )
        );

      // Filter out SKIP bets - they don't participate in settlement
      const votingBets = bets.filter((bet) => bet.vote !== "SKIP");

      if (votingBets.length === 0) {
        logger.info({ marketId }, "No bets to settle");
        return { settled: 0, totalPointsReturned: 0 };
      }

      const winningVote = result === "INVALID" ? null : result;

      if (result === "INVALID") {
        return this.refundAllBets(marketId, votingBets);
      }

      const winningBets = votingBets.filter((bet) => bet.vote === winningVote);
      const losingBets = votingBets.filter((bet) => bet.vote !== winningVote);

      if (winningBets.length === 0) {
        logger.info({ marketId }, "No winners, refunding all bets");
        return this.refundAllBets(marketId, votingBets);
      }

      const resultData = await db.transaction(async (tx) => {
        let totalPointsReturned = 0;

        for (const bet of winningBets) {
          const returned = await processWinningBetInTx(tx, bet, marketId);
          totalPointsReturned += returned;
        }

        for (const bet of losingBets) {
          await processLosingBetInTx(tx, bet.id);
        }

        return { settled: votingBets.length, totalPointsReturned };
      });

      logger.info(
        {
          marketId,
          winners: winningBets.length,
          losers: losingBets.length,
          totalPointsReturned: resultData.totalPointsReturned,
        },
        "Market settled"
      );

      // Track outcomes for leaderboard
      for (const bet of winningBets) {
        await trackBetOutcome({ userId: bet.userId, won: true });
      }

      for (const bet of losingBets) {
        await trackBetOutcome({ userId: bet.userId, won: false });
      }

      return resultData;
    },

    async refundAllBets(
      marketId: MarketId,
      bets: Array<{
        id: BetId;
        userId: UserId;
        pointsSpent: number;
      }>
    ) {
      let totalRefunded = 0;

      await db.transaction(async (tx) => {
        for (const bet of bets) {
          const pointsToRefund = bet.pointsSpent;
          totalRefunded += pointsToRefund;

          await tx
            .update(DB_SCHEMA.bet)
            .set({
              status: "REFUNDED",
              pointsReturned: pointsToRefund,
              settlementStatus: "SETTLED",
              settledAt: new Date(),
            })
            .where(eq(DB_SCHEMA.bet.id, bet.id));

          await tx
            .update(DB_SCHEMA.userBalance)
            .set({
              points: sql`${DB_SCHEMA.userBalance.points} + ${pointsToRefund}`,
            })
            .where(eq(DB_SCHEMA.userBalance.userId, bet.userId));

          await tx.insert(DB_SCHEMA.transaction).values({
            userId: bet.userId,
            type: "REFUND",
            points: pointsToRefund,
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

      return { settled: bets.length, totalPointsReturned: totalRefunded };
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
