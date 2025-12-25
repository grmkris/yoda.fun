import { z } from "zod";

export const MARKET_CATEGORIES = [
  "sports",
  "entertainment",
  "tech",
  "crypto",
  "politics",
  "memes",
  "other",
] as const;

export const GenerateMarketJobSchema = z.object({
  /** Number of markets to generate (1-10) */
  count: z.number().int().min(1).max(10).default(5),
  /** Optional categories to focus on */
  categories: z.array(z.enum(MARKET_CATEGORIES)).optional(),
  /** Optional trigger source (scheduled, manual, seed, etc.) */
  trigger: z.enum(["scheduled", "manual", "seed"]).default("scheduled"),
});

export type GenerateMarketJob = z.infer<typeof GenerateMarketJobSchema>;
