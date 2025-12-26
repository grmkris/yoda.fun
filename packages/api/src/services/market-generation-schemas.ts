import { ResolutionStrategySchema } from "@yoda.fun/shared/resolution-types";
import { z } from "zod";

/**
 * Valid bet amounts in USD
 */
export const BET_AMOUNTS = ["0.10", "0.25", "0.50", "1.00", "5.00"] as const;

/**
 * Market categories
 */
export const MARKET_CATEGORIES = [
  "sports",
  "entertainment",
  "tech",
  "crypto",
  "politics",
  "memes",
  "other",
] as const;

/**
 * Duration units for market timing
 */
export const DURATION_UNITS = ["hours", "days", "months"] as const;

/**
 * Timeframe presets for market generation
 */
export const TIMEFRAME_PRESETS = ["immediate", "short", "medium"] as const;
export type TimeframePreset = (typeof TIMEFRAME_PRESETS)[number];

// ============================================================================
// Consolidated Search/Resolution Schemas
// ============================================================================

/**
 * Single search result item from any provider
 */
export const SearchResultItemSchema = z.object({
  url: z.string(),
  title: z.string(),
  snippet: z.string(),
  date: z.string().optional(),
});

/**
 * Search result from a provider (used by web-search-resolver)
 */
export const SearchResultSchema = z.object({
  provider: z.enum(["xai_web", "xai_x", "google", "exa"]),
  query: z.string(),
  results: z.array(SearchResultItemSchema),
  error: z.string().optional(),
});

/**
 * Source reference for resolution evidence
 */
export const SourceSchema = z.object({
  url: z.string(),
  snippet: z.string(),
});

/**
 * Standard resolution output (used by all resolvers)
 */
export const ResolutionOutputSchema = z.object({
  result: z.enum(["YES", "NO", "INVALID"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  sources: z.array(SourceSchema),
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type ResolutionOutput = z.infer<typeof ResolutionOutputSchema>;

// ============================================================================
// Resolver-specific Result Schemas
// ============================================================================

/**
 * Price resolution result (extends base with price data)
 */
export const PriceResolutionResultSchema = ResolutionOutputSchema.extend({
  result: z.enum(["YES", "NO"]),
  confidence: z.literal(100),
  priceAtResolution: z.number(),
});
export type PriceResolutionResult = z.infer<typeof PriceResolutionResultSchema>;

/**
 * Sports resolution result
 */
export const SportsResolutionResultSchema = ResolutionOutputSchema;
export type SportsResolutionResult = z.infer<
  typeof SportsResolutionResultSchema
>;

/**
 * Web search resolution result (extends base with tools used)
 */
export const WebSearchResolutionResultSchema = ResolutionOutputSchema.extend({
  toolsUsed: z.array(z.string()),
});
export type WebSearchResolutionResult = z.infer<
  typeof WebSearchResolutionResultSchema
>;

// ============================================================================
// External API Response Schemas
// ============================================================================

/**
 * CoinGecko API response for price data
 */
export const CoinGeckoPriceResponseSchema = z.record(
  z.string(),
  z.object({
    usd: z.number(),
    usd_24h_change: z.number().optional(),
  })
);
export type CoinGeckoPriceResponse = z.infer<
  typeof CoinGeckoPriceResponseSchema
>;

/**
 * TheSportsDB event data
 */
export const TheSportsDBEventSchema = z.object({
  idEvent: z.string(),
  strEvent: z.string(),
  strHomeTeam: z.string(),
  strAwayTeam: z.string(),
  intHomeScore: z.string().nullable(),
  intAwayScore: z.string().nullable(),
  strStatus: z.string(),
  dateEvent: z.string(),
  strLeague: z.string(),
});
export type TheSportsDBEvent = z.infer<typeof TheSportsDBEventSchema>;

/**
 * TheSportsDB API response
 */
export const TheSportsDBResponseSchema = z.object({
  events: z.array(TheSportsDBEventSchema).nullable(),
});
export type TheSportsDBResponse = z.infer<typeof TheSportsDBResponseSchema>;

// ============================================================================
// Internal DTOs
// ============================================================================

/**
 * Market info needed for resolution
 */
export const MarketForResolutionSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  resolutionCriteria: z.string().nullable(),
});
export type MarketForResolution = z.infer<typeof MarketForResolutionSchema>;

/**
 * Duration schema for flexible market timing
 */
export const DurationSchema = z.object({
  value: z.number().int().min(1).describe("Duration value"),
  unit: z
    .enum(DURATION_UNITS)
    .describe("Duration unit (hours, days, or months)"),
});

export type Duration = z.infer<typeof DurationSchema>;

/**
 * Schema for a single AI-generated market
 * Used with aiClient.generateObject() for structured output
 */
export const GeneratedMarketSchema = z.object({
  title: z
    .string()
    .min(10)
    .max(100)
    .describe(
      "Short, punchy question ending with '?' (e.g., 'Will Bitcoin hit $150k by December?')"
    ),

  description: z
    .string()
    .min(20)
    .max(500)
    .describe(
      "1-2 sentences explaining the market context and why it's interesting"
    ),

  category: z
    .enum(MARKET_CATEGORIES)
    .describe("Market category for filtering and discovery"),

  resolutionCriteria: z
    .string()
    .min(20)
    .max(300)
    .describe(
      "Clear, objective criteria for determining YES or NO outcome (e.g., 'Resolves YES if official announcement is made before deadline')"
    ),

  resolutionMethod: ResolutionStrategySchema.describe(
    "How the market will be resolved - PRICE for crypto prices, SPORTS for sports, WEB_SEARCH for news/events"
  ),

  duration: DurationSchema.describe(
    "How long until voting ends. Use hours (1-24) for time-sensitive events, days (1-30) for near-term events, months (1-6) for longer predictions"
  ),

  betAmount: z
    .enum(BET_AMOUNTS)
    .describe("Suggested bet amount in USD per vote"),
});

export type GeneratedMarket = z.infer<typeof GeneratedMarketSchema>;

/**
 * Schema for batch market generation response from AI
 */
export const GeneratedMarketsResponseSchema = z.object({
  markets: z
    .array(GeneratedMarketSchema)
    .min(1)
    .max(10)
    .describe("Array of generated markets"),
});

export type GeneratedMarketsResponse = z.infer<
  typeof GeneratedMarketsResponseSchema
>;

/**
 * Schema for market resolution AI response
 */
export const MarketResolutionSchema = z.object({
  result: z
    .enum(["YES", "NO", "INVALID"])
    .describe("The resolved outcome of the market"),

  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Confidence score 0-100 in the resolution"),

  reasoning: z
    .string()
    .min(10)
    .max(500)
    .describe("Brief explanation of the resolution decision"),

  sources: z
    .array(
      z.object({
        url: z.string().url().describe("Source URL"),
        snippet: z
          .string()
          .max(300)
          .describe("Relevant quote or summary from the source"),
      })
    )
    .min(0)
    .max(5)
    .describe("Evidence sources supporting the resolution"),
});

export type MarketResolution = z.infer<typeof MarketResolutionSchema>;

/**
 * Input for market generation service
 */
export const GenerateMarketsInputSchema = z.object({
  count: z.number().int().min(1).max(100).default(5),
  categories: z.array(z.enum(MARKET_CATEGORIES)).optional(),
  timeframe: z.enum(TIMEFRAME_PRESETS).default("short"),
});

export type GenerateMarketsInput = z.infer<typeof GenerateMarketsInputSchema>;

/**
 * Result from market generation service
 */
export interface GenerateMarketsResult {
  markets: GeneratedMarket[];
  modelVersion: string;
  tokensUsed?: number;
  durationMs: number;
}
