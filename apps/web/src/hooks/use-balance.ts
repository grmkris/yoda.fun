"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

/**
 * Fetch current user's balance
 * Returns available, pending, totalDeposited, totalWithdrawn
 */
export function useBalance() {
  console.log("useBalance");
  return useQuery(orpc.balance.get.queryOptions({}));
}
