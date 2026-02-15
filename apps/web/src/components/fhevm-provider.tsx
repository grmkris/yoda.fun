"use client";

import { FHEVM_CONFIG } from "@yoda.fun/fhevm/sdk";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAccount, useWalletClient } from "wagmi";

interface FhevmInstance {
  createEncryptedInput(
    contractAddress: string,
    userAddress: string
  ): {
    addBool(value: boolean): unknown;
    add64(value: number | bigint): unknown;
    encrypt(): Promise<{
      handles: Uint8Array[];
      inputProof: Uint8Array;
    }>;
  };
}

interface FhevmContextValue {
  instance: FhevmInstance | null;
  isInitializing: boolean;
  contracts: typeof FHEVM_CONFIG.sepolia.contracts;
}

const FhevmContext = createContext<FhevmContextValue>({
  instance: null,
  isInitializing: false,
  contracts: FHEVM_CONFIG.sepolia.contracts,
});

export function useFhevm() {
  return useContext(FhevmContext);
}

export function FhevmProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (!isConnected || !walletClient || !address) {
      setInstance(null);
      return;
    }

    let cancelled = false;

    const init = async () => {
      setIsInitializing(true);
      try {
        // Dynamic import to avoid SSR issues
        const { RelayerClient } = await import("@zama-fhe/relayer-sdk");
        const client = new RelayerClient();
        await client.init();

        if (!cancelled) {
          setInstance(client as unknown as FhevmInstance);
        }
      } catch (error) {
        console.error("Failed to initialize FHEVM:", error);
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [isConnected, walletClient, address]);

  const value = useMemo(
    () => ({
      instance,
      isInitializing,
      contracts: FHEVM_CONFIG.sepolia.contracts,
    }),
    [instance, isInitializing]
  );

  return (
    <FhevmContext.Provider value={value}>{children}</FhevmContext.Provider>
  );
}
