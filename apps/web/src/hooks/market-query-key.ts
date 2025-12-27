import type { MarketId } from "@yoda.fun/shared/typeid";

// Shared query key for market data - usable on both server and client
export const marketQueryKey = (marketId: MarketId) =>
  ["market", marketId] as const;
