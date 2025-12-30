"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PlaceBetInput } from "@/lib/orpc-types";
import { client, orpc } from "@/utils/orpc";

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

export function usePlaceBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PlaceBetInput) => client.bet.place(input),
    onSuccess: () => {
      // Invalidate points to refresh balance
      queryClient.invalidateQueries({
        queryKey: orpc.points.get.queryOptions({}).queryKey,
      });
      // Invalidate daily status to update free skips count
      queryClient.invalidateQueries({
        queryKey: orpc.points.dailyStatus.queryOptions({}).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.bet.history.queryOptions({
          input: {},
        }).queryKey,
      });
    },
    onError: (error) => {
      const { code, message } = getErrorData(error);
      const fallbackMessage =
        error instanceof Error ? error.message : "Failed to place vote";

      switch (code) {
        case "INSUFFICIENT_POINTS":
          toast.error("Not enough points. Buy more to continue.");
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
