"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserId } from "@yoda.fun/shared/typeid";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";

export function useProfile(userId: UserId) {
  return useQuery(
    orpc.profile.getById.queryOptions({
      input: { userId },
    })
  );
}

export function useProfileByUsername(username: string) {
  return useQuery(
    orpc.profile.getByUsername.queryOptions({
      input: { username },
    })
  );
}

export function useMyProfile() {
  return useQuery(orpc.profile.me.queryOptions({}));
}

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

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageBase64: string) =>
      client.profile.uploadAvatar({ image: imageBase64 }),
    onSuccess: () => {
      toast.success("Avatar uploading... will appear shortly");
      // Start polling for the new avatar
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: orpc.profile.me.queryOptions({}).queryKey,
        });
      }, 2000);
      // Stop polling after 30 seconds
      setTimeout(() => clearInterval(pollInterval), 30_000);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to upload avatar";
      toast.error(message);
    },
  });
}
