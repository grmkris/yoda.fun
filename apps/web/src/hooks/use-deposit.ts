"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { toast } from "sonner";
import { parseUnits, publicActions } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { wrapFetchWithPayment } from "x402-fetch";
import { env } from "@/env";
import { orpc } from "@/utils/orpc";

export const DEPOSIT_TIERS = [10, 25, 50, 100] as const;
export type DepositTier = (typeof DEPOSIT_TIERS)[number];

interface DepositResponse {
  success: boolean;
  amount: number;
  newBalance: number;
  transactionId: string;
}

export function useDeposit() {
  const queryClient = useQueryClient();
  const { data: walletClient } = useWalletClient();

  return useMutation({
    mutationFn: async (tier: DepositTier) => {
      if (!walletClient) {
        throw new Error("Wallet not connected");
      }

      const maxValue = parseUnits(String(tier + 1), 6);
      const signer = walletClient.extend(publicActions);

      const fetchWithPayment = wrapFetchWithPayment(fetch, signer, maxValue);

      const apiUrl = SERVICE_URLS[env.NEXT_PUBLIC_ENV].api;
      const response = await fetchWithPayment(`${apiUrl}/api/deposit/${tier}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Deposit failed: ${response.status}`);
      }

      return response.json() as Promise<DepositResponse>;
    },
    onSuccess: (data) => {
      toast.success(
        `Deposited $${data.amount}! New balance: $${data.newBalance.toFixed(2)}`
      );

      // Invalidate points query to refresh UI
      queryClient.invalidateQueries({
        queryKey: orpc.points.get.queryOptions({}).queryKey,
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Deposit failed";
      toast.error(message);
    },
  });
}

export function useCanDeposit() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  return isConnected && !!walletClient;
}

// Dev-only deposit hook (bypasses x402 payment)
export function useDevDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tier: DepositTier) => {
      const apiUrl = SERVICE_URLS[env.NEXT_PUBLIC_ENV].api;
      const response = await fetch(`${apiUrl}/api/deposit/dev/${tier}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
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
      toast.success(
        `[DEV] Deposited $${data.amount}! New balance: $${data.newBalance.toFixed(2)}`
      );

      queryClient.invalidateQueries({
        queryKey: orpc.points.get.queryOptions({}).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Dev deposit failed";
      toast.error(message);
    },
  });
}
