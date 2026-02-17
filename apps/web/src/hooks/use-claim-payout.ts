"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mishaMarketAbi } from "@yoda.fun/fhevm/sdk";
import { toast } from "sonner";
import { useAccount, useWalletClient } from "wagmi";
import { useFhevm } from "@/components/fhevm-provider";

export function useClaimPayout() {
  const { address } = useAccount();
  const { contracts } = useFhevm();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (onChainMarketId: number) => {
      if (!(walletClient && address)) {
        throw new Error("Wallet not connected");
      }

      const txHash = await walletClient.writeContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "claimPayout",
        args: [BigInt(onChainMarketId)],
        gas: BigInt(5_000_000),
      });

      return { txHash };
    },
    onSuccess: () => {
      toast.success("Payout claimed!");
      // Refresh balances
      queryClient.invalidateQueries({ queryKey: ["readContract"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to claim payout";
      toast.error(message);
    },
  });
}
