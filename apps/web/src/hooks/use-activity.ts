"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserId } from "@yoda.fun/shared/typeid";
import { orpc } from "@/utils/orpc";

/**
 * Fetch global activity feed
 */
export function useGlobalActivity(options?: {
  limit?: number;
  offset?: number;
}) {
  return useQuery(
    orpc.activity.global.queryOptions({
      input: {
        limit: options?.limit,
        offset: options?.offset,
      },
    })
  );
}

/**
 * Fetch activity from users the current user follows
 */
export function useFollowingActivity(options?: {
  limit?: number;
  offset?: number;
}) {
  return useQuery(
    orpc.activity.following.queryOptions({
      input: {
        limit: options?.limit,
        offset: options?.offset,
      },
    })
  );
}

/**
 * Fetch a specific user's activity
 */
export function useUserActivity(
  userId: UserId,
  options?: { limit?: number; offset?: number }
) {
  return useQuery(
    orpc.activity.user.queryOptions({
      input: {
        userId,
        limit: options?.limit,
        offset: options?.offset,
      },
    })
  );
}
