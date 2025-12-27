import type { BetHistoryInput } from "@/lib/orpc-types";

// Shared query key for bet history - usable on both server and client
export const betHistoryQueryKey = (options: BetHistoryInput = {}) =>
  ["bet", "history", options] as const;
