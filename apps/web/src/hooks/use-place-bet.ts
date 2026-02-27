"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  confidentialMishaAbi,
  encryptBet,
  mishaMarketAbi,
} from "@yoda.fun/fhevm/sdk";
import { toast } from "sonner";
import { bytesToHex } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useFhevm } from "@/components/fhevm-provider";
import { useLocalVotes } from "@/hooks/use-local-votes";
import { orpc } from "@/utils/orpc";

const MAX_UINT48 = 281_474_976_710_655; // 2^48 - 1
const CMISHA_DECIMALS = 6;

interface PlaceBetInput {
  marketId: string;
  vote: "YES" | "NO";
  onChainMarketId: number;
  /** Bet amount in whole cMISHA tokens (e.g. 100). Will be scaled to 6-decimal units. */
  amount?: number;
}

export function usePlaceBet() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { instance, contracts } = useFhevm();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { recordVote } = useLocalVotes();

  return useMutation({
    mutationFn: async (input: PlaceBetInput) => {
      if (!(instance && address && walletClient && publicClient)) {
        throw new Error("Wallet not connected or FHEVM not initialized");
      }

      // Check operator approval, auto-approve if needed
      const isApproved = await publicClient.readContract({
        address: contracts.confidentialMisha,
        abi: confidentialMishaAbi,
        functionName: "isOperator",
        args: [address, contracts.mishaMarket],
      });

      if (!isApproved) {
        const approveHash = await walletClient.writeContract({
          address: contracts.confidentialMisha,
          abi: confidentialMishaAbi,
          functionName: "setOperator",
          args: [contracts.mishaMarket, MAX_UINT48],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Amount in 6-decimal units (100 cMISHA = 100_000000)
      const wholeAmount = input.amount ?? 100;
      const betAmount = wholeAmount * 10 ** CMISHA_DECIMALS;
      const voteAsBool = input.vote === "YES";

      const encrypted = await encryptBet(
        instance,
        contracts.mishaMarket,
        address,
        voteAsBool,
        betAmount
      );

      const txHash = await walletClient.writeContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "placeBet",
        args: [
          BigInt(input.onChainMarketId),
          bytesToHex(encrypted.encryptedVote),
          bytesToHex(encrypted.encryptedAmount),
          bytesToHex(encrypted.inputProof),
        ],
      });

      // Record vote locally for UX (backend can't see encrypted votes)
      recordVote(input.marketId, input.vote);

      return {
        success: true,
        marketId: input.marketId,
        vote: input.vote,
        txHash,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.bet.history.queryOptions({
          input: {},
        }).queryKey,
      });
      // Refresh on-chain balance
      queryClient.invalidateQueries({ queryKey: ["readContract"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to place vote";
      toast.error(message);
    },
  });
}
