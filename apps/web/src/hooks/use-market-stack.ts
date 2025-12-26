"use client";

import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";

export function useMarketStack(limit = 20) {
  return useQuery({
    queryKey: ["market", "stack", limit],
    queryFn: () => client.market.getStack({ limit }),
  });
}
