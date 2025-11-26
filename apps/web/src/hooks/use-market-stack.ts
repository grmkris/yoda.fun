"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

/**
 * Fetch stack of markets for swiping UI
 * Returns active markets that the current user hasn't bet on yet
 */
export function useMarketStack(limit = 10) {
  return useQuery(orpc.market.getStack.queryOptions({ input: { limit } }));
}
