import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import { MarketId, type UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";

export interface McpServerDeps {
  db: Database;
  logger: Logger;
}

// Metric column mapping for leaderboard
const METRIC_COLUMNS = {
  profit: DB_SCHEMA.userStats.totalProfit,
  winRate: DB_SCHEMA.userStats.winRate,
  streak: DB_SCHEMA.userStats.currentStreak,
} as const;

function getLeaderboardOrderColumn(metric: string) {
  return (
    METRIC_COLUMNS[metric as keyof typeof METRIC_COLUMNS] ??
    METRIC_COLUMNS.profit
  );
}

function getScoreFromStats(
  s: {
    totalProfit: string | null;
    winRate: string | null;
    currentStreak: number | null;
  },
  metric: string
) {
  const scores = {
    profit: s.totalProfit,
    winRate: s.winRate,
    streak: s.currentStreak,
  };
  return scores[metric as keyof typeof scores] ?? s.totalProfit;
}

export function createMcpServer(deps: McpServerDeps, userId: UserId | null) {
  const { db } = deps;

  const server = new McpServer({
    name: "yoda-fun",
    version: "1.0.0",
  });

  server.registerTool(
    "list_markets",
    {
      description: "List active prediction markets on yoda.fun",
      inputSchema: z.object({
        limit: z.number().optional(),
        category: z.string().optional(),
      }),
    },
    async ({ limit = 20 }) => {
      const markets = await db
        .select()
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.status, "LIVE"))
        .orderBy(desc(DB_SCHEMA.market.createdAt))
        .limit(limit);

      const result = {
        count: markets.length,
        markets: markets.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          category: m.category,
          onChainMarketId: m.onChainMarketId,
          votingEndsAt: m.votingEndsAt,
        })),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_market",
    {
      description: "Get details of a specific prediction market",
      inputSchema: z.object({ marketId: MarketId }),
    },
    async ({ marketId }) => {
      const markets = await db
        .select()
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, marketId))
        .limit(1);

      if (!markets[0]) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Market not found" }),
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(markets[0], null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_leaderboard",
    {
      description: "View the yoda.fun leaderboard",
      inputSchema: z.object({
        period: z.enum(["daily", "weekly", "monthly", "allTime"]).optional(),
        metric: z.enum(["profit", "winRate", "streak"]).optional(),
        limit: z.number().optional(),
      }),
    },
    async ({ period = "allTime", metric = "profit", limit = 20 }) => {
      const orderColumn = getLeaderboardOrderColumn(metric);

      const stats = await db
        .select({
          userId: DB_SCHEMA.userStats.userId,
          totalBets: DB_SCHEMA.userStats.totalBets,
          totalWins: DB_SCHEMA.userStats.totalWins,
          winRate: DB_SCHEMA.userStats.winRate,
          totalProfit: DB_SCHEMA.userStats.totalProfit,
          currentStreak: DB_SCHEMA.userStats.currentStreak,
          userName: DB_SCHEMA.user.name,
        })
        .from(DB_SCHEMA.userStats)
        .innerJoin(
          DB_SCHEMA.user,
          eq(DB_SCHEMA.userStats.userId, DB_SCHEMA.user.id)
        )
        .orderBy(desc(orderColumn))
        .limit(limit);

      const result = {
        period,
        metric,
        entries: stats.map((s, i) => ({
          rank: i + 1,
          userId: s.userId,
          name: s.userName,
          score: getScoreFromStats(s, metric),
          totalBets: s.totalBets,
          totalWins: s.totalWins,
        })),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_bet_history",
    {
      description: "Get betting history for a user. Requires authentication.",
      inputSchema: z.object({
        limit: z.number().optional(),
        status: z.enum(["ACTIVE", "WON", "LOST", "REFUNDED"]).optional(),
      }),
    },
    async ({ limit = 20, status }) => {
      if (!userId) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Unauthorized - authentication required",
              }),
            },
          ],
        };
      }

      const conditions = [eq(DB_SCHEMA.bet.userId, userId)];
      if (status) {
        conditions.push(eq(DB_SCHEMA.bet.status, status));
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
        .limit(limit);

      const result = {
        count: bets.length,
        bets: bets.map((b) => ({
          id: b.bet.id,
          marketTitle: b.market.title,
          status: b.bet.status,
          claimed: b.bet.claimed,
          createdAt: b.bet.createdAt,
        })),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return { server };
}
