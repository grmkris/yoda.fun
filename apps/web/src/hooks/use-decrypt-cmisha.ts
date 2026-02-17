"use client";

import {
  type DecryptInstance,
  decryptBalance,
  walletClientToSigner,
} from "@yoda.fun/fhevm/sdk";
import { useCallback, useState } from "react";
import { useWalletClient } from "wagmi";
import { useFhevm } from "@/components/fhevm-provider";
import { useCmishaBalance } from "./use-cmisha-balance";

export function useDecryptCmisha() {
  const { instance, contracts } = useFhevm();
  const { data: walletClient } = useWalletClient();
  const { data: encryptedHandle } = useCmishaBalance();

  const [decryptedBalance, setDecryptedBalance] = useState<bigint | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const hasHandle = encryptedHandle != null && String(encryptedHandle) !== zeroHash && BigInt(encryptedHandle) !== BigInt(0);

  const decrypt = useCallback(async () => {
    if (!instance || !walletClient || !encryptedHandle || !hasHandle) return;

    setIsDecrypting(true);
    setError(null);

    try {
      const signer = walletClientToSigner(walletClient);
      const result = await decryptBalance(
        instance as unknown as DecryptInstance,
        encryptedHandle,
        contracts.confidentialMisha,
        signer,
      );
      setDecryptedBalance(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsDecrypting(false);
    }
  }, [instance, walletClient, encryptedHandle, hasHandle, contracts.confidentialMisha]);

  return { decryptedBalance, decrypt, isDecrypting, error, hasHandle };
}
