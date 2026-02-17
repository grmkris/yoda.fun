import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { BetId, MarketId, UserId } from "@yoda.fun/shared/typeid";

interface BetServiceDeps {
  db: Database;
  logger: Logger;
}

export function createBetService({ deps }: { deps: BetServiceDeps }) {
  const { db } = deps;

  return {
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

    async getBetCount(marketId: MarketId) {
      const bets = await db
        .select({ id: DB_SCHEMA.bet.id })
        .from(DB_SCHEMA.bet)
        .where(eq(DB_SCHEMA.bet.marketId, marketId));

      return bets.length;
    },
  };
}

export type BetService = ReturnType<typeof createBetService>;
