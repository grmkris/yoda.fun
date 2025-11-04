import { ORPCError } from "@orpc/server";
import { bet, market, transaction } from "@yoda.fun/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../api";
import { lockFundsForBet } from "../services/balance";

export const betRouter = {
  /**
   * Place a bet on a market
   */
  place: protectedProcedure
    .input(
      z.object({
        marketId: z.string().min(1, "Market ID is required"),
        vote: z.enum(["YES", "NO"]),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      // Get the market
      const marketRecords = await context.db
        .select()
        .from(market)
        .where(eq(market.id, input.marketId))
        .limit(1);

      if (marketRecords.length === 0) {
        throw new ORPCError({
          code: "NOT_FOUND",
          message: "Market not found",
        });
      }

      const marketData = marketRecords[0];

      // Validate market is active
      if (marketData.status !== "ACTIVE") {
        throw new ORPCError({
          code: "BAD_REQUEST",
          message: "Market is not active for betting",
        });
      }

      // Validate voting period hasn't ended
      if (new Date() > new Date(marketData.votingEndsAt)) {
        throw new ORPCError({
          code: "BAD_REQUEST",
          message: "Voting period has ended",
        });
      }

      // Check if user already has a bet on this market
      const existingBet = await context.db
        .select()
        .from(bet)
        .where(and(eq(bet.userId, userId), eq(bet.marketId, input.marketId)))
        .limit(1);

      if (existingBet.length > 0) {
        throw new ORPCError({
          code: "BAD_REQUEST",
          message: "You have already placed a bet on this market",
        });
      }

      const betAmount = marketData.betAmount;

      // Place bet in a transaction
      const result = await context.db.transaction(async (tx) => {
        try {
          // Lock funds (deduct from available, add to pending)
          await lockFundsForBet(tx, userId, betAmount);

          // Create transaction record
          const [txRecord] = await tx
            .insert(transaction)
            .values({
              userId,
              type: "BET_PLACED",
              amount: betAmount,
              status: "COMPLETED",
              metadata: {
                marketId: input.marketId,
                vote: input.vote,
              },
            })
            .returning();

          // Create bet record
          const [betRecord] = await tx
            .insert(bet)
            .values({
              userId,
              marketId: input.marketId,
              vote: input.vote,
              amount: betAmount,
              status: "ACTIVE",
            })
            .returning();

          // Update market vote counts
          if (input.vote === "YES") {
            await tx
              .update(market)
              .set({
                totalYesVotes: marketData.totalYesVotes + 1,
                totalPool: (
                  Number.parseFloat(marketData.totalPool) +
                  Number.parseFloat(betAmount)
                ).toFixed(2),
              })
              .where(eq(market.id, input.marketId));
          } else {
            await tx
              .update(market)
              .set({
                totalNoVotes: marketData.totalNoVotes + 1,
                totalPool: (
                  Number.parseFloat(marketData.totalPool) +
                  Number.parseFloat(betAmount)
                ).toFixed(2),
              })
              .where(eq(market.id, input.marketId));
          }

          return betRecord;
        } catch (error) {
          if (error instanceof Error && error.message.includes("Insufficient")) {
            throw new ORPCError({
              code: "BAD_REQUEST",
              message: `Insufficient balance. You need $${betAmount} to place this bet.`,
            });
          }
          throw error;
        }
      });

      return {
        success: true,
        betId: result.id,
        marketId: result.marketId,
        vote: result.vote,
        amount: result.amount,
        message: `Bet placed successfully! You voted ${input.vote}.`,
      };
    }),

  /**
   * Get user's bet history
   */
  history: protectedProcedure
    .input(
      z.object({
        status: z.enum(["ACTIVE", "WON", "LOST", "REFUNDED"]).optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const conditions = [eq(bet.userId, userId)];

      if (input.status) {
        conditions.push(eq(bet.status, input.status));
      }

      const bets = await context.db
        .select({
          bet,
          market,
        })
        .from(bet)
        .innerJoin(market, eq(bet.marketId, market.id))
        .where(and(...conditions))
        .orderBy(desc(bet.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        bets,
        limit: input.limit,
        offset: input.offset,
      };
    }),
};
