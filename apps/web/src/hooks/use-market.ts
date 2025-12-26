"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { client } from "@/utils/orpc";

export function useMarket(marketId: MarketId) {
  return useQuery({
    queryKey: ["market", marketId],
    queryFn: () => client.market.get({ marketId }),
  });
}
