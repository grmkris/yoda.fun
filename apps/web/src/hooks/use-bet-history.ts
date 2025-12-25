"use client";

import { useQuery } from "@tanstack/react-query";
import type { BetHistoryInput } from "@/lib/orpc-types";
import { orpc } from "@/utils/orpc";

/**
 * Fetch user's bet history with optional filters
 */
export function useBetHistory(options: BetHistoryInput = {}) {
  const { status, limit = 20, offset = 0 } = options;

  return useQuery(
    orpc.bet.history.queryOptions({
      input: { status, limit, offset },
    })
  );
}
