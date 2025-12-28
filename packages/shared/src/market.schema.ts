import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export interface TopicConfig {
  id: string;
  category: string;
  querySeeds: string[];
}

export interface ResearchConfig {
  topics: TopicConfig[];
  windowHours?: number;
  previousTopics?: string[];
}

// ============================================================================
// Default Topics
// ============================================================================

export const DEFAULT_TOPICS: TopicConfig[] = [
  {
    id: "politics",
    category: "politics",
    querySeeds: [
      "election scheduled this week",
      "parliament vote date",
      "central bank rate decision",
    ],
  },
  {
    id: "sports",
    category: "sports",
    querySeeds: [
      "NBA games today tomorrow",
      "NFL games this week",
      "Premier League fixtures",
      "UFC fights scheduled",
    ],
  },
  {
    id: "entertainment",
    category: "entertainment",
    querySeeds: [
      "movies releasing this week",
      "TV show premieres finales",
      "album release dates",
    ],
  },
  {
    id: "tech",
    category: "tech",
    querySeeds: [
      "tech product launches",
      "Apple Google Microsoft announcements",
    ],
  },
  {
    id: "weather",
    category: "weather",
    querySeeds: [
      "severe weather warnings",
      "hurricane forecast",
      "temperature records",
    ],
  },
  {
    id: "crypto",
    category: "crypto",
    querySeeds: [
      "crypto network upgrades",
      "token unlocks",
      "SEC crypto decisions",
    ],
  },
  {
    id: "viral",
    category: "viral",
    querySeeds: [
      "celebrity news today",
      "viral trending stories",
      "breaking news",
    ],
  },
];

export const BET_AMOUNTS = ["0.10", "0.25", "0.50", "1.00", "5.00"] as const;
export const SPICE_LEVELS = ["mild", "medium", "spicy"] as const;
export type SpiceLevel = (typeof SPICE_LEVELS)[number];

export const MARKET_CATEGORIES = [
  // Entertainment (split from generic "entertainment")
  "movies",
  "tv",
  "music",
  "celebrities",
  "gaming",
  // Core
  "sports",
  "politics",
  "tech",
  "crypto", // CAPPED at 5% (~12/day)
  // Social/Viral
  "viral",
  "memes",
  // Misc
  "weather",
  "other",
] as const;
export const MarketCategory = z.enum(MARKET_CATEGORIES);
export type MarketCategory = z.infer<typeof MarketCategory>;
export const DURATION_UNITS = ["hours", "days", "months"] as const;

export const TIMEFRAME_PRESETS = ["immediate", "short", "medium"] as const;
export type TimeframePreset = (typeof TIMEFRAME_PRESETS)[number];

export const SearchResultItemSchema = z.object({
  url: z.string(),
  title: z.string(),
  snippet: z.string(),
  date: z.string().optional(),
});

export const SearchResultSchema = z.object({
  provider: z.enum(["xai_web", "xai_x", "google", "exa"]),
  query: z.string(),
  results: z.array(SearchResultItemSchema),
  error: z.string().optional(),
});

export const SourceSchema = z.object({
  url: z.string(),
  snippet: z.string(),
});

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

export const PriceResolutionResultSchema = ResolutionOutputSchema.extend({
  result: z.enum(["YES", "NO"]),
  confidence: z.literal(100),
  priceAtResolution: z.number(),
});
export type PriceResolutionResult = z.infer<typeof PriceResolutionResultSchema>;

export const SportsResolutionResultSchema = ResolutionOutputSchema;
export type SportsResolutionResult = z.infer<
  typeof SportsResolutionResultSchema
>;

export const WebSearchResolutionResultSchema = ResolutionOutputSchema.extend({
  toolsUsed: z.array(z.string()),
});
export type WebSearchResolutionResult = z.infer<
  typeof WebSearchResolutionResultSchema
>;

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

export const TheSportsDBResponseSchema = z.object({
  events: z.array(TheSportsDBEventSchema).nullable(),
});
export type TheSportsDBResponse = z.infer<typeof TheSportsDBResponseSchema>;

export const DurationSchema = z.object({
  value: z.number().int().min(1).describe("Duration value"),
  unit: z
    .enum(DURATION_UNITS)
    .describe("Duration unit (hours, days, or months)"),
});

export type Duration = z.infer<typeof DurationSchema>;

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
      "Plain English resolution criteria that an AI will interpret to determine YES/NO (e.g., 'Resolves YES if Bitcoin reaches $100,000 on CoinGecko')"
    ),

  duration: DurationSchema.describe(
    "How long until voting ends. Use hours (1-24) for time-sensitive events, days (1-30) for near-term events, months (1-6) for longer predictions"
  ),

  betAmount: z
    .enum(BET_AMOUNTS)
    .describe("Suggested bet amount in USD per vote"),

  whyViral: z
    .string()
    .min(10)
    .max(200)
    .describe(
      "One sentence explaining why people will share, argue about, or screenshot this market"
    ),

  spiceLevel: z
    .enum(SPICE_LEVELS)
    .describe(
      "How provocative the framing is: mild (safe), medium (has a take), spicy (will generate debate)"
    ),
});

export type GeneratedMarket = z.infer<typeof GeneratedMarketSchema>;

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

export const GenerateMarketsInputSchema = z.object({
  count: z.number().int().min(1).max(100).default(5),
  categories: z.array(z.enum(MARKET_CATEGORIES)).optional(),
  timeframe: z.enum(TIMEFRAME_PRESETS).default("short"),
});

export type GenerateMarketsInput = z.infer<typeof GenerateMarketsInputSchema>;

export interface GenerateMarketsResult {
  markets: GeneratedMarket[];
  modelVersion: string;
  tokensUsed?: number;
  durationMs: number;
}
