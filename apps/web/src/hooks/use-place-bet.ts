"use client";

import {
  encryptBet,
  mishaMarketAbi,
} from "@yoda.fun/fhevm/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAccount, useWalletClient, useWriteContract } from "wagmi";
import { useFhevm } from "@/components/fhevm-provider";
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

interface PlaceBetOnChainInput extends PlaceBetInput {
  onChainMarketId?: number;
  amount?: number;
}

export function usePlaceBet() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { instance, contracts } = useFhevm();
  const { data: walletClient } = useWalletClient();
  const writeContract = useWriteContract();

  return useMutation({
    mutationFn: async (input: PlaceBetOnChainInput) => {
      // Off-chain path: SKIP votes or markets without on-chain ID
      if (
        input.vote === "SKIP" ||
        !input.onChainMarketId ||
        !instance ||
        !address ||
        !walletClient
      ) {
        return client.bet.place(input);
      }

      // On-chain path: encrypt and send tx
      const betAmount = input.amount ?? 100;
      const voteAsBool = input.vote === "YES";

      const encrypted = await encryptBet(
        instance,
        contracts.mishaMarket,
        address,
        voteAsBool,
        betAmount
      );

      // Send the encrypted bet transaction
      const txHash = await walletClient.writeContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "placeBet",
        args: [
          BigInt(input.onChainMarketId),
          encrypted.encryptedVote as `0x${string}`,
          encrypted.encryptedAmount as `0x${string}`,
          encrypted.inputProof as `0x${string}`,
        ],
      });

      // Record in backend DB
      const result = await client.bet.recordOnChain({
        marketId: input.marketId,
        txHash,
        vote: input.vote,
        amount: betAmount,
      });

      return {
        success: true,
        betId: result.betId,
        marketId: input.marketId,
        vote: input.vote,
        message: `On-chain bet placed! You voted ${input.vote}.`,
        txHash,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.points.get.queryOptions({}).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.points.dailyStatus.queryOptions({}).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.bet.history.queryOptions({
          input: {},
        }).queryKey,
      });
      // Refresh on-chain balance
      queryClient.invalidateQueries({ queryKey: ["readContract"] });
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
