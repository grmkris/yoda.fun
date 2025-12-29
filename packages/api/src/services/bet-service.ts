import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { BetId, MarketId, UserId } from "@yoda.fun/shared/typeid";
import { err, ok, type Result } from "neverthrow";
import type { SelectBet } from "../../../db/src/schema/market/market.zod";
import type { DailyService } from "./daily-service";
import { VOTE_COST } from "./points-service";

export type BetServiceError =
  | { type: "MARKET_NOT_FOUND"; message: "Market not found" }
  | { type: "MARKET_NOT_ACTIVE"; message: "Market is not active for betting" }
  | { type: "VOTING_ENDED"; message: "Voting period has ended" }
  | {
      type: "ALREADY_BET";
      message: "You have already placed a bet on this market";
    }
  | { type: "INSUFFICIENT_POINTS"; message: "Not enough points to vote" }
  | { type: "BET_CREATION_FAILED"; message: "Failed to create bet record" };

interface BetServiceDeps {
  db: Database;
  logger: Logger;
  dailyService: DailyService;
}

export function createBetService({ deps }: { deps: BetServiceDeps }) {
  const { db, logger, dailyService } = deps;

  return {
    async placeBet(
      userId: UserId,
      input: {
        marketId: MarketId;
        vote: "YES" | "NO" | "SKIP";
      }
    ): Promise<Result<SelectBet | null, BetServiceError>> {
      // Handle SKIP separately - doesn't affect market
      if (input.vote === "SKIP") {
        return this.handleSkip(userId, input.marketId);
      }

      // Get the market
      const marketRecords = await db
        .select()
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, input.marketId))
        .limit(1);

      const marketData = marketRecords[0];
      if (!marketData) {
        return err({ type: "MARKET_NOT_FOUND", message: "Market not found" });
      }

      // Validate market is active
      if (marketData.status !== "LIVE") {
        return err({
          type: "MARKET_NOT_ACTIVE",
          message: "Market is not active for betting",
        });
      }

      // Validate voting period hasn't ended
      if (new Date() > new Date(marketData.votingEndsAt)) {
        return err({
          type: "VOTING_ENDED",
          message: "Voting period has ended",
        });
      }

      // Check if user already has a bet on this market
      const existingBet = await db
        .select()
        .from(DB_SCHEMA.bet)
        .where(
          and(
            eq(DB_SCHEMA.bet.userId, userId),
            eq(DB_SCHEMA.bet.marketId, input.marketId)
          )
        )
        .limit(1);

      if (existingBet.length > 0) {
        return err({
          type: "ALREADY_BET",
          message: "You have already placed a bet on this market",
        });
      }

      // Fixed cost: 3 points for YES/NO
      const pointsCost = VOTE_COST;

      // Place bet in a transaction
      const result = await db.transaction(async (tx) => {
        // Get user's points
        const balanceRecords = await tx
          .select()
          .from(DB_SCHEMA.userBalance)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .limit(1);

        const balance = balanceRecords[0];
        const availablePoints = balance?.points ?? 0;

        if (availablePoints < pointsCost) {
          return err({
            type: "INSUFFICIENT_POINTS" as const,
            message: "Not enough points to vote" as const,
          });
        }

        // Deduct points from user's balance
        if (balance) {
          await tx
            .update(DB_SCHEMA.userBalance)
            .set({
              points: sql`${DB_SCHEMA.userBalance.points} - ${pointsCost}`,
            })
            .where(eq(DB_SCHEMA.userBalance.userId, userId));
        }

        // Create transaction record for bet
        await tx.insert(DB_SCHEMA.transaction).values({
          userId,
          type: "BET_PLACED",
          points: -pointsCost,
          status: "COMPLETED",
          metadata: {
            marketId: input.marketId,
            vote: input.vote,
          },
        });

        // Create bet record
        const betRecords = await tx
          .insert(DB_SCHEMA.bet)
          .values({
            userId,
            marketId: input.marketId,
            vote: input.vote,
            pointsSpent: pointsCost,
            status: "ACTIVE",
          })
          .returning();

        const betRecord = betRecords[0];
        if (!betRecord) {
          return err({
            type: "BET_CREATION_FAILED" as const,
            message: "Failed to create bet record" as const,
          });
        }

        // Update market vote counts (no pool - points based)
        const updateData =
          input.vote === "YES"
            ? { totalYesVotes: marketData.totalYesVotes + 1 }
            : { totalNoVotes: marketData.totalNoVotes + 1 };

        await tx
          .update(DB_SCHEMA.market)
          .set(updateData)
          .where(eq(DB_SCHEMA.market.id, input.marketId));

        return ok(betRecord);
      });

      if (result.isErr()) {
        return result;
      }

      logger.info(
        {
          userId,
          marketId: input.marketId,
          vote: input.vote,
          pointsSpent: pointsCost,
          betId: result.value.id,
        },
        "Bet placed"
      );

      return result;
    },

    /**
     * Handle SKIP vote - doesn't create a real bet, just tracks skip
     */
    async handleSkip(
      userId: UserId,
      marketId: MarketId
    ): Promise<Result<null, BetServiceError>> {
      // Check if user already has a bet on this market
      const existingBet = await db
        .select()
        .from(DB_SCHEMA.bet)
        .where(
          and(
            eq(DB_SCHEMA.bet.userId, userId),
            eq(DB_SCHEMA.bet.marketId, marketId)
          )
        )
        .limit(1);

      if (existingBet.length > 0) {
        return err({
          type: "ALREADY_BET",
          message: "You have already placed a bet on this market",
        });
      }

      // Use skip (handles free vs paid skips)
      const { cost, freeSkipsRemaining } = await dailyService.useSkip(userId);

      // If skip costs points, check balance first
      if (cost > 0) {
        const balanceRecords = await db
          .select()
          .from(DB_SCHEMA.userBalance)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .limit(1);

        const availablePoints = balanceRecords[0]?.points ?? 0;
        if (availablePoints < cost) {
          return err({
            type: "INSUFFICIENT_POINTS",
            message: "Not enough points to vote",
          });
        }
      }

      // Create skip "bet" record (to prevent voting again)
      await db.insert(DB_SCHEMA.bet).values({
        userId,
        marketId,
        vote: "SKIP",
        pointsSpent: cost,
        status: "ACTIVE", // SKIPs don't settle
      });

      logger.info(
        {
          userId,
          marketId,
          skipCost: cost,
          freeSkipsRemaining,
        },
        "Market skipped"
      );

      return ok(null);
    },

    async getBetHistory(
      userId: UserId,
      input: {
        status?: "ACTIVE" | "WON" | "LOST" | "REFUNDED";
        limit: number;
        offset: number;
      }
    ) {
      const conditions = [eq(DB_SCHEMA.bet.userId, userId)];

      if (input.status) {
        conditions.push(eq(DB_SCHEMA.bet.status, input.status));
      }

      const bets = await db
        .select({
          bet: DB_SCHEMA.bet,
          market: DB_SCHEMA.market,
        })
        .from(DB_SCHEMA.bet)
        .innerJoin(
          DB_SCHEMA.market,
          eq(DB_SCHEMA.bet.marketId, DB_SCHEMA.market.id)
        )
        .where(and(...conditions))
        .orderBy(desc(DB_SCHEMA.bet.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return bets;
    },

    async getBetById(userId: UserId, betId: BetId) {
      const result = await db
        .select({
          bet: DB_SCHEMA.bet,
          market: DB_SCHEMA.market,
        })
        .from(DB_SCHEMA.bet)
        .innerJoin(
          DB_SCHEMA.market,
          eq(DB_SCHEMA.bet.marketId, DB_SCHEMA.market.id)
        )
        .where(
          and(eq(DB_SCHEMA.bet.id, betId), eq(DB_SCHEMA.bet.userId, userId))
        )
        .limit(1);

      return result[0] ?? null;
    },

    /**
     * Get market crowd stats (after user votes)
     */
    async getMarketCrowd(marketId: MarketId) {
      const market = await db
        .select({
          totalYesVotes: DB_SCHEMA.market.totalYesVotes,
          totalNoVotes: DB_SCHEMA.market.totalNoVotes,
        })
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, marketId))
        .limit(1);

      const data = market[0];
      if (!data) {
        return null;
      }

      const total = data.totalYesVotes + data.totalNoVotes;
      const yesPercent =
        total > 0 ? Math.round((data.totalYesVotes / total) * 100) : 50;
      const noPercent =
        total > 0 ? Math.round((data.totalNoVotes / total) * 100) : 50;

      return {
        totalVotes: total,
        yesVotes: data.totalYesVotes,
        noVotes: data.totalNoVotes,
        yesPercent,
        noPercent,
      };
    },
  };
}
