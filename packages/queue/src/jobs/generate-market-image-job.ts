import { z } from "zod";

export const GenerateMarketImageJobSchema = z.object({
  marketId: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
});

export type GenerateMarketImageJob = z.infer<
  typeof GenerateMarketImageJobSchema
>;
