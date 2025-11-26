import { MarketId } from "@yoda.fun/shared/typeid";
import { z } from "zod";

export const ResolveMarketJobSchema = z.object({
  marketId: MarketId,
});

export type ResolveMarketJob = z.infer<typeof ResolveMarketJobSchema>;
