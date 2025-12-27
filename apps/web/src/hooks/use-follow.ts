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
 * Get follow counts for a user
 */
export function useFollowCounts(userId: UserId) {
  return useQuery(
    orpc.follow.counts.queryOptions({
      input: { userId },
    })
  );
}
