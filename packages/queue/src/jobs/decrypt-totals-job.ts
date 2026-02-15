import { z } from "zod";

export const DecryptTotalsJobSchema = z.object({
  marketId: z.string(),
  onChainMarketId: z.number(),
  attempt: z.number().default(0),
});

export type DecryptTotalsJob = z.infer<typeof DecryptTotalsJobSchema>;
