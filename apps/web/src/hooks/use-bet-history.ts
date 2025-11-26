"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

type BetStatus = "ACTIVE" | "WON" | "LOST" | "REFUNDED";

type UseBetHistoryOptions = {
  status?: BetStatus;
  limit?: number;
  offset?: number;
};

/**
 * Fetch user's bet history with optional filters
 */
export function useBetHistory(options: UseBetHistoryOptions = {}) {
  const { status, limit = 20, offset = 0 } = options;

  return useQuery(
    orpc.bet.history.queryOptions({
      input: { status, limit, offset },
    })
  );
}
