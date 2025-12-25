"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";

interface PlaceBetInput {
  marketId: MarketId;
  vote: "YES" | "NO";
}

interface ORPCErrorData {
  code?: string;
  message?: string;
}

function getErrorData(error: unknown): ORPCErrorData {
  if (error && typeof error === "object" && "data" in error) {
    return (error as { data: ORPCErrorData }).data ?? {};
  }
  return {};
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
      const { code, message } = getErrorData(error);
      const fallbackMessage = error instanceof Error ? error.message : "Failed to place bet";

      switch (code) {
        case "INSUFFICIENT_BALANCE":
          toast.error("Not enough balance. Deposit more to continue.");
          break;
        case "ALREADY_BET":
          toast.error("You already voted on this market.");
          break;
        case "MARKET_NOT_FOUND":
          toast.error("Market not found.");
          break;
        case "MARKET_NOT_ACTIVE":
          toast.error("This market is no longer active.");
          break;
        case "VOTING_ENDED":
          toast.error("Voting period has ended.");
          break;
        default:
          toast.error(message ?? fallbackMessage);
      }
    },
  });
}
