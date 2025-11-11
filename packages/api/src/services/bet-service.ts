import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { MarketId, UserId } from "@yoda.fun/shared/typeid";

type BetServiceDeps = {
  db: Database;
  logger: Logger;
};

type BetServiceParams = Record<string, never>;

export function createBetService({
  deps,
}: {
  deps: BetServiceDeps;
  params?: BetServiceParams;
}) {
  const { db, logger } = deps;

  return {
    /**
     * Place a vote on a market
     */
    async placeBet(
      userId: UserId,
      input: {
        marketId: MarketId;
        vote: "YES" | "NO";
      }
    ) {
      // Get the market
      const marketRecords = await db
        .select()
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, input.marketId))
        .limit(1);

      const marketData = marketRecords[0];
      if (!marketData) {
        throw new Error("Market not found");
      }

      // Validate market is active
      if (marketData.status !== "ACTIVE") {
        throw new Error("Market is not active for betting");
      }

      // Validate voting period hasn't ended
      if (new Date() > new Date(marketData.votingEndsAt)) {
        throw new Error("Voting period has ended");
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
        throw new Error("You have already placed a bet on this market");
      }

      // Place vote in a transaction
      const result = await db.transaction(async (tx) => {
        // Create bet record (vote only, no money)
        const betRecords = await tx
          .insert(DB_SCHEMA.bet)
          .values({
            userId,
            marketId: input.marketId,
            vote: input.vote,
            amount: "0.00", // No money in MVP
            status: "ACTIVE",
          })
          .returning();

        const betRecord = betRecords[0];
        if (!betRecord) {
          throw new Error("Failed to create bet record");
        }

        // Update market vote counts
        if (input.vote === "YES") {
          await tx
            .update(DB_SCHEMA.market)
            .set({
              totalYesVotes: marketData.totalYesVotes + 1,
            })
            .where(eq(DB_SCHEMA.market.id, input.marketId));
        } else {
          await tx
            .update(DB_SCHEMA.market)
            .set({
              totalNoVotes: marketData.totalNoVotes + 1,
            })
            .where(eq(DB_SCHEMA.market.id, input.marketId));
        }

        return betRecord;
      });

      logger.info({
        userId,
        marketId: input.marketId,
        vote: input.vote,
        betId: result.id,
      }, "Vote placed");

      return result;
    },

    /**
     * Get user's bet history
     */
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
  };
}
