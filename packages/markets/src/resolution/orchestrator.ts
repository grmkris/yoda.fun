import type { AiClient } from "@yoda.fun/ai";
import type { SelectMarket } from "@yoda.fun/db/schema";
import type { Logger } from "@yoda.fun/logger";
import type { ResolutionMetadata } from "@yoda.fun/shared/resolution-types";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { resolveWithAgent } from "./agentic-resolver";

export type MarketResult = "YES" | "NO" | "INVALID";

export interface SettlementService {
  resolveMarket: (
    marketId: MarketId,
    result: MarketResult,
    metadata?: ResolutionMetadata
  ) => Promise<{ marketId: MarketId; result: MarketResult }>;
}

export interface ResolutionDeps {
  aiClient: AiClient;
  settlementService: SettlementService;
  logger: Logger;
}

export interface ResolutionResult {
  success: boolean;
  result?: MarketResult;
  error?: string;
}

export type MarketToResolve = Pick<
  SelectMarket,
  | "id"
  | "title"
  | "description"
  | "category"
  | "resolutionCriteria"
  | "createdAt"
  | "votingEndsAt"
  | "resolutionDeadline"
>;

export async function resolveMarket(
  market: MarketToResolve,
  deps: ResolutionDeps
): Promise<ResolutionResult> {
  const { aiClient, settlementService, logger } = deps;

  logger.info({ marketId: market.id, title: market.title }, "Resolving market");

  const resolution = await resolveWithAgent(market, aiClient, logger);

  logger.info(
    {
      marketId: market.id,
      result: resolution.result,
      confidence: resolution.confidence,
      toolsUsed: resolution.toolsUsed,
    },
    "Resolution complete"
  );

  await settlementService.resolveMarket(market.id, resolution.result, {
    sources: resolution.sources,
    confidence: resolution.confidence,
    reasoning: resolution.reasoning,
  });

  return { success: true, result: resolution.result };
}
