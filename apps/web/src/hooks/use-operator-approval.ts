"use client";

import { confidentialMishaAbi } from "@yoda.fun/fhevm/sdk";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useFhevm } from "@/components/fhevm-provider";

const MAX_UINT48 = 281474976710655; // 2^48 - 1

/**
 * Check if MishaMarket is an approved ERC-7984 operator for the current user.
 * If not, provides a function to call setOperator(mishaMarket, MAX_UINT48).
 * One-time per wallet.
 */
export function useOperatorApproval() {
  const { address } = useAccount();
  const { contracts } = useFhevm();

  const { data: isApproved, refetch } = useReadContract({
    address: contracts.confidentialMisha,
    abi: confidentialMishaAbi,
    functionName: "isOperator",
    args: address ? [address, contracts.mishaMarket] : undefined,
    query: {
      enabled: !!address && !!contracts.confidentialMisha && !!contracts.mishaMarket,
    },
  });

  const approve = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: approve.data });

  const setOperator = () => {
    approve.writeContract({
      address: contracts.confidentialMisha,
      abi: confidentialMishaAbi,
      functionName: "setOperator",
      args: [contracts.mishaMarket, MAX_UINT48],
    });
  };

  // Refetch after successful tx
  if (receipt.isSuccess && !isApproved) {
    refetch();
  }

  return {
    isOperatorApproved: isApproved === true,
    setOperator,
    isPending: approve.isPending || receipt.isLoading,
    isSuccess: receipt.isSuccess,
  };
}
