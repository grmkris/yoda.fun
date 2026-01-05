"use client";

import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import type { Provider as SolanaProvider } from "@reown/appkit-adapter-solana/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { toast } from "sonner";
import { useWalletClient } from "wagmi";

import { env } from "@/env";
import { createX402SolanaFetch } from "@/lib/x402-solana";
import { orpc } from "@/utils/orpc";

export const DEPOSIT_TIERS = [0.1, 1, 5, 10] as const;
export type DepositTier = (typeof DEPOSIT_TIERS)[number];

interface DepositResponse {
  success: boolean;
  usdc: number;
  points: number;
  newBalance: number;
  transactionId: string;
}

// Detect connected chain type via AppKit namespaces
function useConnectedChain() {
  const evmAccount = useAppKitAccount({ namespace: "eip155" });
  const solanaAccount = useAppKitAccount({ namespace: "solana" });

  if (evmAccount.isConnected) {
    return "evm" as const;
  }
  if (solanaAccount.isConnected) {
    return "solana" as const;
  }
  return null;
}

export function useDeposit() {
  const queryClient = useQueryClient();
  const { data: evmWalletClient } = useWalletClient();
  const { walletProvider: solanaProvider } =
    useAppKitProvider<SolanaProvider>("solana");
  const connectedChain = useConnectedChain();

  return useMutation({
    mutationFn: async (tier: DepositTier) => {
      if (!connectedChain) {
        throw new Error("No wallet connected");
      }

      const apiUrl = SERVICE_URLS[env.NEXT_PUBLIC_ENV].api;
      let response: Response;

      if (connectedChain === "evm") {
        if (!evmWalletClient?.account) {
          throw new Error("EVM wallet not ready");
        }

        const client = new x402Client();
        const signer = {
          address: evmWalletClient.account.address,
          signTypedData: (
            params: Parameters<typeof evmWalletClient.signTypedData>[0]
          ) => evmWalletClient.signTypedData(params),
        };
        registerExactEvmScheme(client, { signer });
        const fetchWithPayment = wrapFetchWithPayment(fetch, client);

        response = await fetchWithPayment(`${apiUrl}/deposit/${tier}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
      } else {
        if (!solanaProvider?.publicKey) {
          throw new Error("Solana wallet not ready");
        }

        const solanaFetch = createX402SolanaFetch({
          wallet: {
            address: solanaProvider.publicKey.toString(),
            signTransaction: (tx) => solanaProvider.signTransaction(tx),
          },
          maxPaymentAmount: 10_000_000n, // Max 10 USDC
        });

        response = await solanaFetch(`${apiUrl}/deposit/${tier}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Deposit failed: ${response.status}`);
      }

      return response.json() as Promise<DepositResponse>;
    },
    onSuccess: (data) => {
      const network = connectedChain === "solana" ? "Solana" : "Base";
      toast.success(
        `Deposited $${data.usdc} via ${network}! +${data.points} points`
      );
      queryClient.invalidateQueries({
        queryKey: orpc.points.get.queryOptions({}).queryKey,
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Deposit failed");
    },
  });
}

export function useCanDeposit() {
  const connectedChain = useConnectedChain();
  const { data: evmWalletClient } = useWalletClient();
  const { walletProvider: solanaProvider } =
    useAppKitProvider<SolanaProvider>("solana");

  if (connectedChain === "evm") {
    return !!evmWalletClient?.account;
  }
  if (connectedChain === "solana") {
    return !!solanaProvider?.publicKey;
  }
  return false;
}

export function useConnectedNetwork() {
  const chain = useConnectedChain();
  if (chain === "evm") {
    return "base" as const;
  }
  if (chain === "solana") {
    return "solana" as const;
  }
  return null;
}

// Dev-only deposit hook (bypasses x402 payment)
export function useDevDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tier: DepositTier) => {
      const apiUrl = SERVICE_URLS[env.NEXT_PUBLIC_ENV].api;
      const response = await fetch(`${apiUrl}/deposit/dev/${tier}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error || `Dev deposit failed: ${response.status}`
        );
      }

      return response.json() as Promise<DepositResponse>;
    },
    onSuccess: (data) => {
      toast.success(`[DEV] Deposited $${data.usdc}! +${data.points} points`);
      queryClient.invalidateQueries({
        queryKey: orpc.points.get.queryOptions({}).queryKey,
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Dev deposit failed"
      );
    },
  });
}
