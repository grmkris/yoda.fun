"use client";

import { confidentialMishaAbi } from "@yoda.fun/fhevm/sdk";
import { useAccount, useReadContract } from "wagmi";
import { useFhevm } from "@/components/fhevm-provider";

/**
 * Returns the encrypted cMISHA balance handle.
 * The actual value must be decrypted via the Zama relayer SDK
 * using the user's signer.
 */
export function useCmishaBalance() {
  const { address } = useAccount();
  const { contracts } = useFhevm();

  return useReadContract({
    address: contracts.confidentialMisha,
    abi: confidentialMishaAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contracts.confidentialMisha,
    },
  });
}
