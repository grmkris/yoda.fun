"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { client } from "@/utils/orpc";

export function useFaucet() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error("Wallet not connected");
      }
      return client.faucet.mint({ walletAddress: address });
    },
    onSuccess: (data) => {
      toast.success(`Received ${data.amount} test MISHA tokens!`);
      // Invalidate balance queries to refresh
      queryClient.invalidateQueries({ queryKey: ["readContract"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Faucet request failed";
      toast.error(message);
    },
  });
}
