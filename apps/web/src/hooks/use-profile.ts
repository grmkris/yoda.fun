"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserId } from "@yoda.fun/shared/typeid";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";

/**
 * Fetch a user's public profile by userId
 */
export function useProfile(userId: UserId) {
  return useQuery(
    orpc.profile.getById.queryOptions({
      input: { userId },
    })
  );
}

/**
 * Fetch a user's public profile by username
 */
export function useProfileByUsername(username: string) {
  return useQuery(
    orpc.profile.getByUsername.queryOptions({
      input: { username },
    })
  );
}

/**
 * Fetch current user's own profile
 */
export function useMyProfile() {
  return useQuery(orpc.profile.me.queryOptions({}));
}

/**
 * Update current user's profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      bio?: string;
      avatarUrl?: string;
      isPublic?: boolean;
      showStats?: boolean;
      showBetHistory?: boolean;
      twitterHandle?: string;
      telegramHandle?: string;
    }) => client.profile.update(input),
    onSuccess: () => {
      toast.success("Profile updated!");

      // Invalidate profile queries
      queryClient.invalidateQueries({
        queryKey: orpc.profile.me.queryOptions({}).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    },
  });
}

/**
 * Fetch a user's bet history (if visible)
 */
export function useProfileBets(
  userId: UserId,
  options?: { limit?: number; offset?: number }
) {
  return useQuery(
    orpc.profile.bets.queryOptions({
      input: {
        userId,
        limit: options?.limit,
        offset: options?.offset,
      },
    })
  );
}

/**
 * Set/claim a unique username
 */
export function useSetUsername() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) =>
      client.profile.setUsername({ username }),
    onSuccess: () => {
      toast.success("Username set!");
      queryClient.invalidateQueries({
        queryKey: orpc.profile.me.queryOptions({}).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to set username";
      toast.error(message);
    },
  });
}
