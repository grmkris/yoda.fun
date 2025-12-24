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

  votingDays: z
    .number()
    .int()
    .min(1)
    .max(30)
    .describe("Number of days until voting ends (1-30)"),

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
  count: z.number().int().min(1).max(10).default(5),
  categories: z.array(z.enum(MARKET_CATEGORIES)).optional(),
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
