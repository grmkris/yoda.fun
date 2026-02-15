"use client";

import { mishaTokenAbi } from "@yoda.fun/fhevm/sdk";
import { useAccount, useReadContract } from "wagmi";
import { useFhevm } from "@/components/fhevm-provider";

export function useMishaBalance() {
  const { address } = useAccount();
  const { contracts } = useFhevm();

  return useReadContract({
    address: contracts.mishaToken,
    abi: mishaTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contracts.mishaToken,
    },
  });
}
