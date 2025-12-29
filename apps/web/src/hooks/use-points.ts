"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";

/**
 * Fetch current user's points and daily status
 */
export function usePoints() {
  return useQuery(orpc.points.get.queryOptions({}));
}

/**
 * Get daily status (for UI indicators)
 */
export function useDailyStatus() {
  return useQuery(orpc.points.dailyStatus.queryOptions({}));
}

/**
 * Claim daily points (5 points, tap to claim)
 */
export function useClaimDaily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => client.points.claimDaily({}),
    onSuccess: (data) => {
      toast.success(`Claimed ${data.pointsClaimed} points!`);
      queryClient.invalidateQueries({
        queryKey: orpc.points.get.queryOptions({ input: {} }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.points.dailyStatus.queryOptions({ input: {} }).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to claim daily points";
      toast.error(message);
    },
  });
}

/**
 * Get available point packs for purchase
 */
export function usePointPacks() {
  return useQuery(orpc.points.packs.queryOptions({}));
}

/**
 * Purchase points with USDC
 */
export function usePurchasePoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      tier: "starter" | "standard" | "pro" | "whale";
      txHash?: string;
    }) => client.points.purchase(input),
    onSuccess: (data) => {
      toast.success(`Purchased ${data.pointsPurchased} points!`);
      queryClient.invalidateQueries({
        queryKey: orpc.points.get.queryOptions({ input: {} }).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to purchase points";
      toast.error(message);
    },
  });
}
