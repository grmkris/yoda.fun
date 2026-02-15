import type { client } from "@/utils/orpc";

type ExtractSuccess<T> = Exclude<T, { code: string; message: string }>;

// Market
export type MarketListResponse = ExtractSuccess<
  Awaited<ReturnType<typeof client.market.list>>
>;
export type Market = MarketListResponse["markets"][0];
export type MarketGetResponse = ExtractSuccess<
  Awaited<ReturnType<typeof client.market.get>>
>;
export type MarketStackResponse = ExtractSuccess<
  Awaited<ReturnType<typeof client.market.getStack>>
>;
export type StackMarket = MarketStackResponse["markets"][0];

// Bet
export type BetHistoryResponse = ExtractSuccess<
  Awaited<ReturnType<typeof client.bet.history>>
>;
export type BetWithMarket = BetHistoryResponse["bets"][0];
export type Bet = BetWithMarket["bet"];
export type BetMarket = BetWithMarket["market"];
export type BetStatus = Bet["status"];
export type BetByIdResponse = ExtractSuccess<
  Awaited<ReturnType<typeof client.bet.byId>>
>;

// Resolution
export type MarketResult = NonNullable<Market["result"]>;
export type MarketResolutionSources = Market["resolutionSources"];
export type ResolutionSource = NonNullable<MarketResolutionSources>[0];
export type ResolutionConfidence = Market["resolutionConfidence"];
export type ResolutionReasoning = Market["resolutionReasoning"];

// Leaderboard
export type LeaderboardResponse = ExtractSuccess<
  Awaited<ReturnType<typeof client.leaderboard.get>>
>;
export type LeaderboardInput = Parameters<typeof client.leaderboard.get>[0];
export type LeaderboardPeriod = NonNullable<LeaderboardInput["period"]>;
export type LeaderboardMetric = NonNullable<LeaderboardInput["metric"]>;

// Input
export type MarketListInput = Parameters<typeof client.market.list>[0];
export type BetHistoryInput = Parameters<typeof client.bet.history>[0];
export type PlaceBetInput = Parameters<typeof client.bet.place>[0];
export type RecordOnChainBetInput = Parameters<
  typeof client.bet.recordOnChain
>[0];
export type FaucetMintInput = Parameters<typeof client.faucet.mint>[0];
