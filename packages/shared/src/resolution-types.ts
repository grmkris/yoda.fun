import { z } from "zod";

export const SPORTS_LEAGUES = [
  "nba",
  "nfl",
  "mlb",
  "nhl",
  "soccer",
  "mma",
  "boxing",
  "tennis",
  "esports",
] as const;

export const PriceStrategySchema = z.object({
  type: z.literal("PRICE"),
  provider: z.literal("coingecko"),
  coinId: z.string(),
  operator: z.enum([">=", "<=", ">", "<"]),
  threshold: z.number().positive(),
});

export const SportsStrategySchema = z.object({
  type: z.literal("SPORTS"),
  provider: z.literal("thesportsdb"),
  sport: z.enum(SPORTS_LEAGUES),
  teamId: z.string().optional(),
  teamName: z.string(),
  outcome: z.enum(["win", "lose"]),
});

export const WebSearchStrategySchema = z.object({
  type: z.literal("WEB_SEARCH"),
  searchQuery: z.string().min(5),
  successIndicators: z.array(z.string()).min(1).max(5),
  verificationUrls: z.array(z.string().url()).optional(),
});

export const ResolutionStrategySchema = z.discriminatedUnion("type", [
  PriceStrategySchema,
  SportsStrategySchema,
  WebSearchStrategySchema,
]);

export type SportsLeague = (typeof SPORTS_LEAGUES)[number];
export type PriceStrategy = z.infer<typeof PriceStrategySchema>;
export type SportsStrategy = z.infer<typeof SportsStrategySchema>;
export type WebSearchStrategy = z.infer<typeof WebSearchStrategySchema>;
export type ResolutionStrategy = z.infer<typeof ResolutionStrategySchema>;
export type ResolutionMethodType = ResolutionStrategy["type"];

export const MarketForResolutionSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  resolutionCriteria: z.string().nullable(),
});
export type MarketForResolution = z.infer<typeof MarketForResolutionSchema>;

export const AIResolutionSchema = z.object({
  result: z.enum(["YES", "NO", "INVALID"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  sources: z.array(
    z.object({
      url: z.string(),
      snippet: z.string(),
      relevance: z.string(),
    })
  ),
});
export type AIResolutionResult = z.infer<typeof AIResolutionSchema>;
