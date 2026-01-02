import { ORPCError } from "@orpc/server";
import { DB_SCHEMA } from "@yoda.fun/db";
import {
  and,
  desc,
  eq,
  gt,
  notInArray,
  type SQL,
  sql,
} from "@yoda.fun/db/drizzle";
import type { SelectMarket } from "@yoda.fun/db/schema";
import { MarketId, UserId } from "@yoda.fun/shared/typeid";
import type { StorageClient } from "@yoda.fun/storage";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../api";

function withPublicImageUrl<T extends SelectMarket>(
  market: T,
  storage?: StorageClient
): T {
  if (!storage) {
    return market;
  }
  return {
    ...market,
    imageUrl: market.imageUrl ? storage.getPublicUrl(market.imageUrl) : null,
    thumbnailUrl: market.thumbnailUrl
      ? storage.getPublicUrl(market.thumbnailUrl)
      : null,
  };
}

function withPublicImageUrls<T extends SelectMarket>(
  markets: T[],
  storage?: StorageClient
): T[] {
  if (!storage) {
    return markets;
  }
  return markets.map((m) => withPublicImageUrl(m, storage));
}

const MAX_MARKETS_PER_PAGE = 100;
const DEFAULT_MARKETS_PER_PAGE = 20;
const MAX_STACK_SIZE = 50;
const DEFAULT_STACK_SIZE = 10;

export const marketRouter = {
  /**
   * List markets with filters
   */
  list: publicProcedure
    .input(
      z.object({
        status: z
          .enum(["LIVE", "VOTING_ENDED", "SETTLED", "CANCELLED"])
          .optional(),
        limit: z
          .number()
          .min(1)
          .max(MAX_MARKETS_PER_PAGE)
          .optional()
          .default(DEFAULT_MARKETS_PER_PAGE),
        offset: z.number().min(0).optional().default(0),
        category: z.string().optional(),
        resolved: z.boolean().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const conditions: SQL[] = [];

      if (input.status) {
        conditions.push(eq(DB_SCHEMA.market.status, input.status));
      }

      if (input.category) {
        conditions.push(eq(DB_SCHEMA.market.category, input.category));
      }

      if (input.resolved !== undefined) {
        if (input.resolved) {
          conditions.push(eq(DB_SCHEMA.market.status, "SETTLED"));
        } else {
          conditions.push(notInArray(DB_SCHEMA.market.status, ["SETTLED"]));
        }
      }

      const markets = await context.db
        .select()
        .from(DB_SCHEMA.market)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(DB_SCHEMA.market.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        markets: withPublicImageUrls(markets, context.storage),
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get a single market by ID
   * Includes user's bet if authenticated
   */
  get: publicProcedure
    .input(
      z.object({
        marketId: MarketId,
      })
    )
    .handler(async ({ context, input }) => {
      const market = await context.db.query.market.findFirst({
        where: eq(DB_SCHEMA.market.id, input.marketId),
      });

      if (!market) {
        throw new ORPCError("NOT_FOUND");
      }

      // Get user's bet if authenticated
      const userBet = context.session?.user?.id
        ? await context.db.query.bet.findFirst({
            where: and(
              eq(DB_SCHEMA.bet.marketId, input.marketId),
              eq(DB_SCHEMA.bet.userId, UserId.parse(context.session.user.id))
            ),
          })
        : null;

      return {
        ...withPublicImageUrl(market, context.storage),
        userBet,
      };
    }),

  /**
   * Get stack of cards for swiping UI
   * Returns active markets that the user hasn't bet on yet
   */
  getStack: protectedProcedure
    .input(
      z.object({
        limit: z
          .number()
          .min(1)
          .max(MAX_STACK_SIZE)
          .optional()
          .default(DEFAULT_STACK_SIZE),
        cursor: z.string().datetime().optional(),
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
      const conditions: SQL[] = [
        eq(DB_SCHEMA.market.status, "LIVE"),
        gt(DB_SCHEMA.market.votingEndsAt, new Date()),
      ];

      // Exclude markets user has already voted on
      if (betMarketIds.length > 0) {
        conditions.push(notInArray(DB_SCHEMA.market.id, betMarketIds));
      }

      // Cursor-based pagination: fetch items older than cursor
      if (input.cursor) {
        conditions.push(
          sql`${DB_SCHEMA.market.createdAt} < ${new Date(input.cursor)}`
        );
      }

      // Fetch one extra to determine if there are more items
      const markets = await context.db
        .select()
        .from(DB_SCHEMA.market)
        .where(and(...conditions))
        .orderBy(desc(DB_SCHEMA.market.createdAt))
        .limit(input.limit + 1);

      const hasMore = markets.length > input.limit;
      const items = hasMore ? markets.slice(0, input.limit) : markets;
      const lastItem = items.at(-1);

      return {
        markets: withPublicImageUrls(items, context.storage),
        nextCursor:
          hasMore && lastItem ? lastItem.createdAt.toISOString() : undefined,
      };
    }),
};
