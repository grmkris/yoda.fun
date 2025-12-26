"use client";

import { useQuery } from "@tanstack/react-query";
import type { BetId } from "@yoda.fun/shared/typeid";
import { orpc } from "@/utils/orpc";

export function useBet(betId: BetId) {
  return useQuery(orpc.bet.byId.queryOptions({ input: { betId } }));
}
