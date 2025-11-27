"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "allTime";
type LeaderboardMetric = "profit" | "winRate" | "streak";

/**
 * Fetch leaderboard data
 */
export function useLeaderboard(options?: {
  period?: LeaderboardPeriod;
  metric?: LeaderboardMetric;
  limit?: number;
  offset?: number;
}) {
  return useQuery(
    orpc.leaderboard.get.queryOptions({
      input: {
        period: options?.period ?? "allTime",
        metric: options?.metric ?? "profit",
        limit: options?.limit,
        offset: options?.offset,
      },
    })
  );
}

/**
 * Fetch current user's rank
 */
export function useMyRank(options?: {
  period?: LeaderboardPeriod;
  metric?: LeaderboardMetric;
}) {
  return useQuery(
    orpc.leaderboard.myRank.queryOptions({
      input: {
        period: options?.period ?? "allTime",
        metric: options?.metric ?? "profit",
      },
    })
  );
}

/**
 * Fetch users near current user on leaderboard
 */
export function useNearbyUsers(options?: {
  period?: LeaderboardPeriod;
  metric?: LeaderboardMetric;
  range?: number;
}) {
  return useQuery(
    orpc.leaderboard.nearby.queryOptions({
      input: {
        period: options?.period ?? "allTime",
        metric: options?.metric ?? "profit",
        range: options?.range,
      },
    })
  );
}
