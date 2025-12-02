"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { toast } from "sonner";
import { parseUnits } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { wrapFetchWithPayment } from "x402-fetch";
import { env } from "@/env";
import { orpc } from "@/utils/orpc";

export const DEPOSIT_TIERS = [10, 25, 50, 100] as const;
export type DepositTier = (typeof DEPOSIT_TIERS)[number];

type DepositResponse = {
  success: boolean;
  amount: number;
  newBalance: number;
  transactionId: string;
};

/**
 * Deposit funds using x402 payment protocol
 * Automatically handles wallet signing and 402 payment flow
 */
export function useDeposit() {
  const queryClient = useQueryClient();
  const { data: walletClient } = useWalletClient();

  return useMutation({
    mutationFn: async (tier: DepositTier) => {
      if (!walletClient) {
        throw new Error("Wallet not connected");
      }

      // Max payment value in USDC base units (6 decimals)
      // Set to tier amount + small buffer for fees
      const maxValue = parseUnits(String(tier + 1), 6);

      // Wrap fetch with x402 payment handling
      const fetchWithPayment = wrapFetchWithPayment(
        fetch,
        walletClient,
        maxValue
      );

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

      // Invalidate balance query to refresh UI
      queryClient.invalidateQueries({
        queryKey: orpc.balance.get.queryOptions({ input: {} }).queryKey,
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Deposit failed";
      toast.error(message);
    },
  });
}

/**
 * Check if user can deposit (wallet connected)
 */
export function useCanDeposit() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  return isConnected && !!walletClient;
}
