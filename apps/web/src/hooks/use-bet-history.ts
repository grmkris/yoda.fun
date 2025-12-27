"use client";

import { useQuery } from "@tanstack/react-query";
import type { BetHistoryInput } from "@/lib/orpc-types";
import { client } from "@/utils/orpc";
import { betHistoryQueryKey } from "./bet-history-query-key";

/**
 * Fetch user's bet history with optional filters
 */
export function useBetHistory(options: BetHistoryInput = {}) {
  const { status, limit = 20, offset = 0 } = options;
  const input = { status, limit, offset };

  return useQuery({
    queryKey: betHistoryQueryKey(input),
    queryFn: () => client.bet.history(input),
  });
}
