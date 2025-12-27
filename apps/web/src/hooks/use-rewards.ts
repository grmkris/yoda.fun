"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";

export function useRewardSummary() {
  return useQuery(orpc.reward.getSummary.queryOptions({}));
}

export function useClaimableRewards() {
  return useQuery({
    ...orpc.reward.getClaimableCount.queryOptions({}),
    refetchInterval: 60_000,
  });
}

export function useDailyStatus() {
  return useQuery(orpc.reward.getDailyStatus.queryOptions({}));
}

export function useClaimDailyStreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => client.reward.claimDaily({}),
    onSuccess: (data) => {
      toast.success(`Claimed $${data.amount.toFixed(2)} for day ${data.streakDay}!`);
      queryClient.invalidateQueries({
        queryKey: orpc.reward.getSummary.queryOptions({ input: {} }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.reward.getClaimableCount.queryOptions({ input: {} }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.reward.getDailyStatus.queryOptions({ input: {} }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.balance.get.queryOptions({ input: {} }).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to claim reward";
      toast.error(message);
    },
  });
}

export function useReferralCode() {
  return useQuery(orpc.reward.getReferralCode.queryOptions({}));
}

export function useApplyReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => client.reward.applyReferralCode({ code }),
    onSuccess: () => {
      toast.success("Referral code applied!");
      queryClient.invalidateQueries({
        queryKey: orpc.reward.getSummary.queryOptions({ input: {} }).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Invalid referral code";
      toast.error(message);
    },
  });
}

export function useRewardHistory(options?: { limit?: number; offset?: number }) {
  return useQuery(
    orpc.reward.getHistory.queryOptions({
      input: {
        limit: options?.limit ?? 20,
        offset: options?.offset ?? 0,
      },
    })
  );
}
