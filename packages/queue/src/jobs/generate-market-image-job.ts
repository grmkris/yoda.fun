import { MarketId } from "@yoda.fun/shared/typeid";
import { z } from "zod";

export const GenerateMarketImageJobSchema = z.object({
  marketId: MarketId,
  title: z.string(),
  description: z.string(),
  category: z.string(),
});

export type GenerateMarketImageJob = z.infer<
  typeof GenerateMarketImageJobSchema
>;
