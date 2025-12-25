import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { MarketId, UserId } from "@yoda.fun/shared/typeid";
import { err, ok, type Result } from "neverthrow";
import type { SelectBet } from "../../../db/src/schema/market/market.zod";

export type BetServiceError =
  | { type: "MARKET_NOT_FOUND"; message: "Market not found" }
  | { type: "MARKET_NOT_ACTIVE"; message: "Market is not active for betting" }
  | { type: "VOTING_ENDED"; message: "Voting period has ended" }
  | {
      type: "ALREADY_BET";
      message: "You have already placed a bet on this market";
    }
  | { type: "INSUFFICIENT_BALANCE"; message: string }
  | { type: "INVALID_AMOUNT"; message: "Bet amount must be greater than 0" }
  | { type: "BET_CREATION_FAILED"; message: "Failed to create bet record" };

interface BetServiceDeps {
  db: Database;
  logger: Logger;
}

export function createBetService({ deps }: { deps: BetServiceDeps }) {
  const { db, logger } = deps;

  return {
    async placeBet(
      userId: UserId,
      input: {
        marketId: MarketId;
        vote: "YES" | "NO";
        amount?: number;
      }
    ): Promise<Result<SelectBet, BetServiceError>> {
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
      if (marketData.status !== "ACTIVE") {
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

      // Use provided amount or market's default bet amount
      const betAmount = input.amount ?? Number(marketData.betAmount);
      if (betAmount <= 0) {
        return err({
          type: "INVALID_AMOUNT",
          message: "Bet amount must be greater than 0",
        });
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
          return err({
            type: "INSUFFICIENT_BALANCE" as const,
            message: `Insufficient balance: ${availableBalance.toFixed(2)} < ${betAmount.toFixed(2)}`,
          });
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
          return err({
            type: "BET_CREATION_FAILED" as const,
            message: "Failed to create bet record" as const,
          });
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
          amount: betAmount,
          betId: result.value.id,
        },
        "Bet placed"
      );

      return result;
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
  };
}
