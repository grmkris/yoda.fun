import { ORPCError } from "@orpc/server";
import { bet, market } from "@yoda.fun/db";
import { and, desc, eq, gt, notInArray } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../api";

export const marketRouter = {
  /**
   * List markets with filters
   */
  list: publicProcedure
    .input(
      z.object({
        status: z
          .enum(["ACTIVE", "CLOSED", "RESOLVED", "CANCELLED"])
          .optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        category: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const conditions = [];

      if (input.status) {
        conditions.push(eq(market.status, input.status));
      }

      if (input.category) {
        conditions.push(eq(market.category, input.category));
      }

      const markets = await context.db
        .select()
        .from(market)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(market.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        markets,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get a single market by ID
   */
  get: publicProcedure
    .input(
      z.object({
        marketId: z.string().min(1, "Market ID is required"),
      })
    )
    .handler(async ({ context, input }) => {
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

      return marketRecords[0];
    }),

  /**
   * Get stack of cards for swiping UI
   * Returns active markets that the user hasn't bet on yet
   */
  getStack: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      // Get markets the user hasn't bet on
      const userBets = await context.db
        .select({ marketId: bet.marketId })
        .from(bet)
        .where(eq(bet.userId, userId));

      const betMarketIds = userBets.map((b) => b.marketId);

      // Get active markets, excluding those the user has bet on
      const conditions = [
        eq(market.status, "ACTIVE"),
        gt(market.votingEndsAt, new Date()),
      ];

      // Exclude markets user has already bet on
      if (betMarketIds.length > 0) {
        conditions.push(notInArray(market.id, betMarketIds));
      }

      const markets = await context.db
        .select()
        .from(market)
        .where(and(...conditions))
        .orderBy(desc(market.createdAt))
        .limit(input.limit);

      return {
        markets,
      };
    }),

  /**
   * Get user's bets on markets
   */
  myBets: protectedProcedure
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
