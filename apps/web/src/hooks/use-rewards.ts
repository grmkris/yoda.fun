"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";

/**
 * Get reward summary (win streaks, referrals, etc.)
 */
export function useRewardSummary() {
  return useQuery(orpc.reward.getSummary.queryOptions({}));
}

/**
 * Get count of claimable rewards
 */
export function useClaimableRewards() {
  return useQuery({
    ...orpc.reward.getClaimableCount.queryOptions({}),
    refetchInterval: 60_000,
  });
}

/**
 * Get user's referral code
 */
export function useReferralCode() {
  return useQuery(orpc.reward.getReferralCode.queryOptions({}));
}

/**
 * Apply a referral code
 */
export function useApplyReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) =>
      client.reward.applyReferralCode({ code }),
    onSuccess: () => {
      toast.success("Referral code applied! +10 bonus points");
      queryClient.invalidateQueries({
        queryKey: orpc.reward.getSummary.queryOptions({ input: {} }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.points.get.queryOptions({ input: {} }).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Invalid referral code";
      toast.error(message);
    },
  });
}

/**
 * Get reward history
 */
export function useRewardHistory(options?: {
  limit?: number;
  offset?: number;
}) {
  return useQuery(
    orpc.reward.getHistory.queryOptions({
      input: {
        limit: options?.limit ?? 20,
        offset: options?.offset ?? 0,
      },
    })
  );
}
