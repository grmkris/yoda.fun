import { z } from "zod";

// Legacy types - kept for backwards compatibility with existing DB records
// All new markets use web search for resolution
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

/** @deprecated Use resolutionCriteria text field instead */
export const PriceStrategySchema = z.object({
  type: z.literal("PRICE"),
  provider: z.literal("coingecko"),
  coinId: z.string(),
  operator: z.enum([">=", "<=", ">", "<"]),
  threshold: z.number().positive(),
});

/** @deprecated Use resolutionCriteria text field instead */
export const SportsStrategySchema = z.object({
  type: z.literal("SPORTS"),
  provider: z.literal("thesportsdb"),
  sport: z.enum(SPORTS_LEAGUES),
  teamId: z.string().optional(),
  teamName: z.string(),
  outcome: z.enum(["win", "lose"]),
});

/** @deprecated Use resolutionCriteria text field instead */
export const WebSearchStrategySchema = z.object({
  type: z.literal("WEB_SEARCH"),
  searchQuery: z.string().min(5),
  successIndicators: z.array(z.string()).min(1).max(5),
  verificationUrls: z.array(z.string().url()).optional(),
});

/** @deprecated Use resolutionCriteria text field instead */
export const ResolutionStrategySchema = z.discriminatedUnion("type", [
  PriceStrategySchema,
  SportsStrategySchema,
  WebSearchStrategySchema,
]);

export type SportsLeague = (typeof SPORTS_LEAGUES)[number];
/** @deprecated */
export type PriceStrategy = z.infer<typeof PriceStrategySchema>;
/** @deprecated */
export type SportsStrategy = z.infer<typeof SportsStrategySchema>;
/** @deprecated */
export type WebSearchStrategy = z.infer<typeof WebSearchStrategySchema>;
/** @deprecated */
export type ResolutionStrategy = z.infer<typeof ResolutionStrategySchema>;
/** @deprecated */
export type ResolutionMethodType = ResolutionStrategy["type"];

export const MarketForResolutionSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  resolutionCriteria: z.string().nullable(),
  // Temporal context - critical for accurate resolution
  createdAt: z.coerce.date(),
  votingEndsAt: z.coerce.date(),
  resolutionDeadline: z.coerce.date(),
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

export const ResolutionMetadataSchema = z.object({
  sources: z
    .array(z.object({ url: z.string(), snippet: z.string() }))
    .optional(),
  confidence: z.number().min(0).max(100).optional(),
  reasoning: z.string().optional(),
});
export type ResolutionMetadata = z.infer<typeof ResolutionMetadataSchema>;
