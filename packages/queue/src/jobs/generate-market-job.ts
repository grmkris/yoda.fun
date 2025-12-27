import { MarketCategory } from "@yoda.fun/shared/market.schema";
import { z } from "zod";

export const GenerateMarketJobSchema = z.object({
  /** Number of markets to generate (1-100, batched internally) */
  count: z.number().int().min(1).max(100).default(5),
  /** Optional categories to focus on */
  categories: z.array(MarketCategory).optional(),
  /** Optional trigger source (scheduled, manual, seed, etc.) */
  trigger: z.enum(["scheduled", "manual", "seed"]).default("scheduled"),
});

export type GenerateMarketJob = z.infer<typeof GenerateMarketJobSchema>;
