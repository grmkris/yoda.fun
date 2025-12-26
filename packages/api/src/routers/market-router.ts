import { ORPCError } from "@orpc/server";
import { DB_SCHEMA } from "@yoda.fun/db";
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  isNotNull,
  notInArray,
  type SQL,
  sql,
} from "@yoda.fun/db/drizzle";
import type { SelectMarket } from "@yoda.fun/db/schema";
import { MarketId, UserId } from "@yoda.fun/shared/typeid";
import type { StorageClient } from "@yoda.fun/storage";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../api";

function withSignedImageUrl<T extends SelectMarket>(
  market: T,
  storage?: StorageClient
): T {
  if (!storage) {
    return market;
  }
  return {
    ...market,
    imageUrl: market.imageUrl
      ? storage.getSignedUrl({ key: market.imageUrl, expiresIn: 3600 })
      : null,
    thumbnailUrl: market.thumbnailUrl
      ? storage.getSignedUrl({ key: market.thumbnailUrl, expiresIn: 3600 })
      : null,
  };
}

function withSignedImageUrls<T extends SelectMarket>(
  markets: T[],
  storage?: StorageClient
): T[] {
  if (!storage) {
    return markets;
  }
  return markets.map((m) => withSignedImageUrl(m, storage));
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
        resolutionType: z.enum(["PRICE", "SPORTS", "WEB_SEARCH"]).optional(),
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

      if (input.resolutionType) {
        conditions.push(
          eq(DB_SCHEMA.market.resolutionType, input.resolutionType)
        );
      }

      const markets = await context.db
        .select()
        .from(DB_SCHEMA.market)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(DB_SCHEMA.market.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        markets: withSignedImageUrls(markets, context.storage),
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
        ...withSignedImageUrl(market, context.storage),
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
        markets: withSignedImageUrls(items, context.storage),
        nextCursor:
          hasMore && lastItem ? lastItem.createdAt.toISOString() : undefined,
      };
    }),

  /**
   * Get resolution statistics for dashboard
   */
  resolutionStats: publicProcedure
    .input(
      z.object({
        period: z.enum(["day", "week", "month"]).default("week"),
      })
    )
    .handler(async ({ context, input }) => {
      const now = new Date();
      let startDate: Date;

      switch (input.period) {
        case "day":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get total resolved count
      const totalResult = await context.db
        .select({ count: count() })
        .from(DB_SCHEMA.market)
        .where(
          and(
            eq(DB_SCHEMA.market.status, "SETTLED"),
            gte(DB_SCHEMA.market.resolvedAt, startDate)
          )
        );

      const totalResolved = totalResult[0]?.count ?? 0;

      // Get average confidence
      const avgResult = await context.db
        .select({
          avg: sql<number>`COALESCE(AVG(${DB_SCHEMA.market.resolutionConfidence}), 0)`,
        })
        .from(DB_SCHEMA.market)
        .where(
          and(
            eq(DB_SCHEMA.market.status, "SETTLED"),
            gte(DB_SCHEMA.market.resolvedAt, startDate)
          )
        );

      const avgConfidence = Math.round(avgResult[0]?.avg ?? 0);

      // Get method breakdown
      const methodBreakdown = await context.db
        .select({
          method: DB_SCHEMA.market.resolutionType,
          count: count(),
        })
        .from(DB_SCHEMA.market)
        .where(
          and(
            eq(DB_SCHEMA.market.status, "SETTLED"),
            gte(DB_SCHEMA.market.resolvedAt, startDate),
            isNotNull(DB_SCHEMA.market.resolutionType)
          )
        )
        .groupBy(DB_SCHEMA.market.resolutionType);

      // Get recent resolutions
      const recentResolutions = await context.db
        .select({
          id: DB_SCHEMA.market.id,
          title: DB_SCHEMA.market.title,
          result: DB_SCHEMA.market.result,
          resolutionConfidence: DB_SCHEMA.market.resolutionConfidence,
          resolvedAt: DB_SCHEMA.market.resolvedAt,
        })
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.status, "SETTLED"))
        .orderBy(desc(DB_SCHEMA.market.resolvedAt))
        .limit(10);

      return {
        totalResolved,
        avgConfidence,
        methodBreakdown: methodBreakdown.map((m) => ({
          method: m.method,
          count: m.count,
        })),
        recentResolutions,
      };
    }),
};
