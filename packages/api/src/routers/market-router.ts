import { ORPCError } from "@orpc/server";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq, gt, notInArray } from "@yoda.fun/db/drizzle";
import { MarketId, UserId } from "@yoda.fun/shared/typeid";
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
        conditions.push(eq(DB_SCHEMA.market.status, input.status));
      }

      if (input.category) {
        conditions.push(eq(DB_SCHEMA.market.category, input.category));
      }

      const markets = await context.db
        .select()
        .from(DB_SCHEMA.market)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(DB_SCHEMA.market.createdAt))
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
        marketId: MarketId,
      })
    )
    .handler(async ({ context, input }) => {
      const marketRecords = await context.db
        .select()
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, input.marketId))
        .limit(1);

      if (marketRecords.length === 0) {
        throw new ORPCError("NOT_FOUND");
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
      const userId = UserId.parse(context.session.user.id);

      // Get markets the user hasn't voted on
      const userBets = await context.db
        .select({ marketId: DB_SCHEMA.bet.marketId })
        .from(DB_SCHEMA.bet)
        .where(eq(DB_SCHEMA.bet.userId, userId));

      const betMarketIds = userBets.map((b) => b.marketId);

      // Get active markets, excluding those the user has voted on
      const conditions = [
        eq(DB_SCHEMA.market.status, "ACTIVE"),
        gt(DB_SCHEMA.market.votingEndsAt, new Date()),
      ];

      // Exclude markets user has already voted on
      if (betMarketIds.length > 0) {
        conditions.push(notInArray(DB_SCHEMA.market.id, betMarketIds));
      }

      const markets = await context.db
        .select()
        .from(DB_SCHEMA.market)
        .where(and(...conditions))
        .orderBy(desc(DB_SCHEMA.market.createdAt))
        .limit(input.limit);

      return {
        markets,
      };
    }),
};
