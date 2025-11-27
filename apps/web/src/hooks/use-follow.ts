"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserId } from "@yoda.fun/shared/typeid";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";

/**
 * Check if current user is following another user
 */
export function useIsFollowing(userId: UserId) {
  return useQuery(
    orpc.follow.isFollowing.queryOptions({
      input: { userId },
    })
  );
}

/**
 * Toggle follow status for a user
 */
export function useToggleFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: UserId) => client.follow.toggle({ userId }),
    onSuccess: (data, userId) => {
      toast.success(data.isFollowing ? "Following!" : "Unfollowed");

      // Invalidate follow status and counts
      queryClient.invalidateQueries({
        queryKey: orpc.follow.isFollowing.queryOptions({
          input: { userId },
        }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.follow.counts.queryOptions({
          input: { userId },
        }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.profile.getById.queryOptions({
          input: { userId },
        }).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to update follow";
      toast.error(message);
    },
  });
}

/**
 * Get a user's followers
 */
export function useFollowers(
  userId: UserId,
  options?: { limit?: number; offset?: number }
) {
  return useQuery(
    orpc.follow.followers.queryOptions({
      input: {
        userId,
        limit: options?.limit,
        offset: options?.offset,
      },
    })
  );
}

/**
 * Get users that a user is following
 */
export function useFollowing(
  userId: UserId,
  options?: { limit?: number; offset?: number }
) {
  return useQuery(
    orpc.follow.following.queryOptions({
      input: {
        userId,
        limit: options?.limit,
        offset: options?.offset,
      },
    })
  );
}

/**
 * Get follow counts for a user
 */
export function useFollowCounts(userId: UserId) {
  return useQuery(
    orpc.follow.counts.queryOptions({
      input: { userId },
    })
  );
}
