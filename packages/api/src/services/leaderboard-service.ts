import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq, gt, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { UserId } from "@yoda.fun/shared/typeid";

export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "allTime";
export type LeaderboardMetric = "profit" | "winRate" | "streak";

interface LeaderboardServiceDeps {
  db: Database;
  logger: Logger;
}

interface UserStatsForStreak {
  currentStreak: number;
  longestStreak: number;
  lastStreakType: "WIN" | "LOSS" | null;
}

function calculateStreak(stats: UserStatsForStreak, won: boolean) {
  const streakType = won ? ("WIN" as const) : ("LOSS" as const);
  const isContinuing =
    stats.lastStreakType === streakType || stats.lastStreakType === null;

  if (!isContinuing) {
    return { currentStreak: 1, longestStreak: stats.longestStreak, streakType };
  }

  const currentStreak = stats.currentStreak + 1;
  const longestStreak =
    won && currentStreak > stats.longestStreak
      ? currentStreak
      : stats.longestStreak;

  return { currentStreak, longestStreak, streakType };
}

function buildWinsUpdate(won: boolean) {
  if (!won) {
    return {
      daily: DB_SCHEMA.userStats.dailyWins,
      weekly: DB_SCHEMA.userStats.weeklyWins,
      monthly: DB_SCHEMA.userStats.monthlyWins,
    };
  }
  return {
    daily: sql`${DB_SCHEMA.userStats.dailyWins} + 1`,
    weekly: sql`${DB_SCHEMA.userStats.weeklyWins} + 1`,
    monthly: sql`${DB_SCHEMA.userStats.monthlyWins} + 1`,
  };
}

export function createLeaderboardService({
  deps,
}: {
  deps: LeaderboardServiceDeps;
}) {
  const { db, logger } = deps;

  /**
   * Get the profit column based on period
   */
  const getProfitColumn = (period: LeaderboardPeriod) => {
    switch (period) {
      case "daily":
        return DB_SCHEMA.userStats.dailyProfit;
      case "weekly":
        return DB_SCHEMA.userStats.weeklyProfit;
      case "monthly":
        return DB_SCHEMA.userStats.monthlyProfit;
      case "allTime":
        return DB_SCHEMA.userStats.totalProfit;
      default:
        throw new Error(`Unknown period: ${period satisfies never}`);
    }
  };

  /**
   * Get the column to sort by based on metric
   */
  const getMetricColumn = (
    metric: LeaderboardMetric,
    period: LeaderboardPeriod
  ) => {
    switch (metric) {
      case "profit":
        return getProfitColumn(period);
      case "winRate":
        return DB_SCHEMA.userStats.winRate;
      case "streak":
        return DB_SCHEMA.userStats.currentStreak;
      default:
        throw new Error(`Unknown metric: ${metric satisfies never}`);
    }
  };

  return {
    /**
     * Get or create user stats record
     */
    async getOrCreateStats(userId: UserId) {
      const existing = await db
        .select()
        .from(DB_SCHEMA.userStats)
        .where(eq(DB_SCHEMA.userStats.userId, userId))
        .limit(1);

      if (existing[0]) {
        return existing[0];
      }

      const [created] = await db
        .insert(DB_SCHEMA.userStats)
        .values({ userId })
        .returning();

      if (!created) {
        throw new Error("Failed to create user stats");
      }
      logger.info({ userId }, "Created new user stats record");
      return created;
    },

    /**
     * Get leaderboard for a specific period and metric
     */
    async getLeaderboard(options: {
      period: LeaderboardPeriod;
      metric: LeaderboardMetric;
      limit?: number;
      offset?: number;
    }) {
      const { period, metric, limit = 100, offset = 0 } = options;
      const metricColumn = getMetricColumn(metric, period);

      // Only include users with at least 1 bet
      const results = await db
        .select({
          userId: DB_SCHEMA.userStats.userId,
          value: metricColumn,
          totalBets: DB_SCHEMA.userStats.totalBets,
          totalWins: DB_SCHEMA.userStats.totalWins,
          winRate: DB_SCHEMA.userStats.winRate,
          currentStreak: DB_SCHEMA.userStats.currentStreak,
          // Join user data
          username: DB_SCHEMA.user.username,
          displayUsername: DB_SCHEMA.user.displayUsername,
          name: DB_SCHEMA.user.name,
          image: DB_SCHEMA.user.image,
        })
        .from(DB_SCHEMA.userStats)
        .innerJoin(
          DB_SCHEMA.user,
          eq(DB_SCHEMA.userStats.userId, DB_SCHEMA.user.id)
        )
        .leftJoin(
          DB_SCHEMA.userProfile,
          eq(DB_SCHEMA.userStats.userId, DB_SCHEMA.userProfile.userId)
        )
        .where(
          and(
            gt(DB_SCHEMA.userStats.totalBets, 0),
            // Only include public profiles (or no profile = public by default)
            sql`(${DB_SCHEMA.userProfile.isPublic} IS NULL OR ${DB_SCHEMA.userProfile.isPublic} = true)`
          )
        )
        .orderBy(desc(metricColumn))
        .limit(limit)
        .offset(offset);

      // Add rank to each result
      return results.map((row, index) => ({
        rank: offset + index + 1,
        userId: row.userId,
        username: row.displayUsername ?? row.username ?? row.name,
        image: row.image,
        value: Number(row.value),
        stats: {
          totalBets: row.totalBets,
          totalWins: row.totalWins,
          winRate: Number(row.winRate),
          currentStreak: row.currentStreak,
        },
      }));
    },

    /**
     * Get a specific user's rank for a metric/period
     */
    async getUserRank(options: {
      userId: UserId;
      period: LeaderboardPeriod;
      metric: LeaderboardMetric;
    }) {
      const { userId, period, metric } = options;
      const metricColumn = getMetricColumn(metric, period);

      // Get user's stats
      const userStats = await db
        .select()
        .from(DB_SCHEMA.userStats)
        .where(eq(DB_SCHEMA.userStats.userId, userId))
        .limit(1);

      const stats = userStats[0];
      if (!stats) {
        return null;
      }

      const userValue = (() => {
        switch (metric) {
          case "profit":
            switch (period) {
              case "daily":
                return stats.dailyProfit;
              case "weekly":
                return stats.weeklyProfit;
              case "monthly":
                return stats.monthlyProfit;
              case "allTime":
                return stats.totalProfit;
              default:
                throw new Error(`Unknown period: ${period satisfies never}`);
            }
          case "winRate":
            return stats.winRate;
          case "streak":
            return String(stats.currentStreak);
          default:
            throw new Error(`Unknown metric: ${metric satisfies never}`);
        }
      })();

      // Count users with higher value
      const higherCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(DB_SCHEMA.userStats)
        .leftJoin(
          DB_SCHEMA.userProfile,
          eq(DB_SCHEMA.userStats.userId, DB_SCHEMA.userProfile.userId)
        )
        .where(
          and(
            gt(DB_SCHEMA.userStats.totalBets, 0),
            gt(metricColumn, userValue),
            sql`(${DB_SCHEMA.userProfile.isPublic} IS NULL OR ${DB_SCHEMA.userProfile.isPublic} = true)`
          )
        );

      const rank = Number(higherCount[0]?.count ?? 0) + 1;

      return {
        rank,
        value: Number(userValue),
        stats: {
          totalBets: stats.totalBets,
          totalWins: stats.totalWins,
          winRate: Number(stats.winRate),
          currentStreak: stats.currentStreak,
        },
      };
    },

    /**
     * Get users near a specific user on the leaderboard
     */
    async getNearbyUsers(options: {
      userId: UserId;
      period: LeaderboardPeriod;
      metric: LeaderboardMetric;
      range?: number;
    }) {
      const { userId, period, metric, range = 2 } = options;

      // Get user's rank first
      const userRank = await this.getUserRank({ userId, period, metric });
      if (!userRank) {
        return { above: [], user: null, below: [] };
      }

      // Get users above and below
      const startOffset = Math.max(0, userRank.rank - range - 1);
      const limit = range * 2 + 1;

      const leaderboard = await this.getLeaderboard({
        period,
        metric,
        limit,
        offset: startOffset,
      });

      const userIndex = leaderboard.findIndex((u) => u.userId === userId);

      return {
        above: leaderboard.slice(0, userIndex),
        user: leaderboard[userIndex] ?? null,
        below: leaderboard.slice(userIndex + 1),
      };
    },

    /**
     * Update user stats after a bet settlement
     */
    async updateStatsOnSettlement(options: {
      userId: UserId;
      won: boolean;
      profit: number;
    }) {
      const { userId, won, profit } = options;
      const stats = await this.getOrCreateStats(userId);

      const newTotalBets = stats.totalBets + 1;
      const newTotalWins = stats.totalWins + (won ? 1 : 0);
      const newTotalLosses = stats.totalLosses + (won ? 0 : 1);
      const newWinRate = (newTotalWins / newTotalBets) * 100;

      const { currentStreak, longestStreak, streakType } = calculateStreak(
        stats,
        won
      );
      const profitFixed = profit.toFixed(2);
      const winsUpdate = buildWinsUpdate(won);

      await db
        .update(DB_SCHEMA.userStats)
        .set({
          totalBets: newTotalBets,
          totalWins: newTotalWins,
          totalLosses: newTotalLosses,
          totalProfit: sql`${DB_SCHEMA.userStats.totalProfit} + ${profitFixed}`,
          winRate: newWinRate.toFixed(2),
          currentStreak,
          longestStreak,
          lastStreakType: streakType,
          dailyProfit: sql`${DB_SCHEMA.userStats.dailyProfit} + ${profitFixed}`,
          dailyWins: winsUpdate.daily,
          weeklyProfit: sql`${DB_SCHEMA.userStats.weeklyProfit} + ${profitFixed}`,
          weeklyWins: winsUpdate.weekly,
          monthlyProfit: sql`${DB_SCHEMA.userStats.monthlyProfit} + ${profitFixed}`,
          monthlyWins: winsUpdate.monthly,
          lastBetAt: new Date(),
          lastWinAt: won ? new Date() : stats.lastWinAt,
        })
        .where(eq(DB_SCHEMA.userStats.userId, userId));

      logger.info(
        { userId, won, profit, newCurrentStreak: currentStreak },
        "Updated user stats on settlement"
      );

      return {
        newCurrentStreak: currentStreak,
        newLongestStreak: longestStreak,
      };
    },

    /**
     * Reset daily stats (call via cron at midnight)
     */
    async resetDailyStats() {
      await db.update(DB_SCHEMA.userStats).set({
        dailyProfit: "0.00",
        dailyWins: 0,
      });

      logger.info({}, "Reset daily stats for all users");
    },

    /**
     * Reset weekly stats (call via cron on Monday)
     */
    async resetWeeklyStats() {
      await db.update(DB_SCHEMA.userStats).set({
        weeklyProfit: "0.00",
        weeklyWins: 0,
      });

      logger.info({}, "Reset weekly stats for all users");
    },

    /**
     * Reset monthly stats (call via cron on 1st of month)
     */
    async resetMonthlyStats() {
      await db.update(DB_SCHEMA.userStats).set({
        monthlyProfit: "0.00",
        monthlyWins: 0,
      });

      logger.info({}, "Reset monthly stats for all users");
    },
  };
}

export type LeaderboardService = ReturnType<typeof createLeaderboardService>;
