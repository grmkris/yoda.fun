"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

type Period = "day" | "week" | "month";

export function useResolutionStats(period: Period = "week") {
  return useQuery(
    orpc.market.resolutionStats.queryOptions({
      input: { period },
    })
  );
}
