"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";

export function useMarketStack(limit = 10) {
  return useInfiniteQuery({
    queryKey: ["market", "stack", { limit }],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      client.market.getStack({ limit, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
}
