"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { client } from "@/utils/orpc";
import { marketQueryKey } from "./market-query-key";

export function useMarket(marketId: MarketId) {
  return useQuery({
    queryKey: marketQueryKey(marketId),
    queryFn: () => client.market.get({ marketId }),
  });
}
