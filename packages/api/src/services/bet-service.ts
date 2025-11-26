import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { MarketId, UserId } from "@yoda.fun/shared/typeid";

type BetServiceDeps = {
  db: Database;
  logger: Logger;
};

export function createBetService({ deps }: { deps: BetServiceDeps }) {
  const { db, logger } = deps;

  return {
    /**
     * Place a bet on a market
     * Validates balance, deducts funds, creates bet record
     */
    async placeBet(
      userId: UserId,
      input: {
        marketId: MarketId;
        vote: "YES" | "NO";
        amount?: number; // If not provided, uses market's betAmount
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

      // Use provided amount or market's default bet amount
      const betAmount = input.amount ?? Number(marketData.betAmount);
      if (betAmount <= 0) {
        throw new Error("Bet amount must be greater than 0");
      }

      // Place bet in a transaction
      const result = await db.transaction(async (tx) => {
        // Get user's balance
        const balanceRecords = await tx
          .select()
          .from(DB_SCHEMA.userBalance)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .limit(1);

        const balance = balanceRecords[0];
        const availableBalance = balance ? Number(balance.availableBalance) : 0;

        if (availableBalance < betAmount) {
          throw new Error(
            `Insufficient balance: ${availableBalance.toFixed(2)} < ${betAmount.toFixed(2)}`
          );
        }

        // Deduct from user's balance
        if (balance) {
          await tx
            .update(DB_SCHEMA.userBalance)
            .set({
              availableBalance: sql`${DB_SCHEMA.userBalance.availableBalance} - ${betAmount.toFixed(2)}`,
            })
            .where(eq(DB_SCHEMA.userBalance.userId, userId));
        }

        // Create transaction record for bet
        await tx.insert(DB_SCHEMA.transaction).values({
          userId,
          type: "BET_PLACED",
          amount: betAmount.toFixed(2),
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
            amount: betAmount.toFixed(2),
            status: "ACTIVE",
          })
          .returning();

        const betRecord = betRecords[0];
        if (!betRecord) {
          throw new Error("Failed to create bet record");
        }

        // Update market vote counts and total pool
        const updateData =
          input.vote === "YES"
            ? {
                totalYesVotes: marketData.totalYesVotes + 1,
                totalPool: sql`${DB_SCHEMA.market.totalPool} + ${betAmount.toFixed(2)}`,
              }
            : {
                totalNoVotes: marketData.totalNoVotes + 1,
                totalPool: sql`${DB_SCHEMA.market.totalPool} + ${betAmount.toFixed(2)}`,
              };

        await tx
          .update(DB_SCHEMA.market)
          .set(updateData)
          .where(eq(DB_SCHEMA.market.id, input.marketId));

        return betRecord;
      });

      logger.info(
        {
          userId,
          marketId: input.marketId,
          vote: input.vote,
          amount: betAmount,
          betId: result.id,
        },
        "Bet placed"
      );

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
