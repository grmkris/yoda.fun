"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { orpc } from "@/utils/orpc";

export const marketQueryOptions = (marketId: MarketId) =>
  orpc.market.get.queryOptions({ input: { marketId } });

export function useMarket(marketId: MarketId) {
  return useQuery(marketQueryOptions(marketId));
}
