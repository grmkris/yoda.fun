"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";

interface PlaceBetInput {
  marketId: MarketId;
  vote: "YES" | "NO";
}

/**
 * Place a bet on a market
 * Automatically invalidates market stack and balance queries on success
 */
export function usePlaceBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PlaceBetInput) => client.bet.place(input),
    onSuccess: (data) => {
      toast.success(`Bet placed! ${data.vote} on market`);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: orpc.market.getStack.queryOptions({ input: {} }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.balance.get.queryOptions({ input: {} }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.bet.history.queryOptions({ input: {} }).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to place bet";
      toast.error(message);
    },
  });
}
