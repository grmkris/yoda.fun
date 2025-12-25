import { type AiClient, Output } from "@yoda.fun/ai";
import { createLeaderboardService } from "@yoda.fun/api/services/leaderboard-service";
import { resolvePriceMarket } from "@yoda.fun/api/services/resolvers/price-resolver";
import { resolveSportsMarket } from "@yoda.fun/api/services/resolvers/sports-resolver";
import { resolveWebSearchMarket } from "@yoda.fun/api/services/resolvers/web-search-resolver";
import { createSettlementService } from "@yoda.fun/api/services/settlement-service";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { QueueClient } from "@yoda.fun/queue";
import type { ResolveMarketJob } from "@yoda.fun/queue/jobs/resolve-market-job";
import type {
  PriceStrategy,
  ResolutionMethodType,
  ResolutionStrategy,
  SportsStrategy,
  WebSearchStrategy,
} from "@yoda.fun/shared/resolution-types";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { z } from "zod";

export interface MarketResolutionWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  aiClient: AiClient;
}

const MarketResolutionSchema = z.object({
  result: z.enum(["YES", "NO", "INVALID"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  sources: z.array(
    z.object({
      url: z.string(),
      snippet: z.string(),
      relevance: z.string(),
    })
  ),
});

export function createMarketResolutionWorker(
  config: MarketResolutionWorkerConfig
): {
  close: () => Promise<void>;
} {
  const { queue, db, logger, aiClient } = config;

  const leaderboardService = createLeaderboardService({ deps: { db, logger } });
  const settlementService = createSettlementService({
    deps: { db, logger, leaderboardService },
  });

  logger.info({ msg: "Starting market resolution worker" });

  const worker = queue.createWorker<"resolve-market">(
    "resolve-market",
    async (job: ResolveMarketJob) => {
      const { marketId } = job;

      logger.info({ marketId }, "Processing market resolution job");

      const marketRecords = await db
        .select()
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, marketId))
        .limit(1);

      const market = marketRecords[0];
      if (!market) {
        logger.warn({ marketId }, "Market not found for resolution");
        return { success: false, marketId };
      }

      if (market.result) {
        logger.info({ marketId }, "Market already resolved, skipping");
        return { success: true, marketId };
      }

      await dispatchResolution(market);

      return { success: true, marketId };
    },
    {
      onFailed: (job: ResolveMarketJob, error: Error): Promise<void> => {
        logger.error({
          msg: "Market resolution failed after all retries",
          marketId: job.marketId,
          error: error.message,
        });
        return Promise.resolve();
      },
    }
  );

  interface MarketForResolution {
    id: MarketId;
    title: string;
    description: string;
    category: string | null;
    resolutionCriteria: string | null;
    resolutionType: ResolutionMethodType | null;
    resolutionStrategy: ResolutionStrategy | null;
  }

  async function handlePriceResolution(
    market: MarketForResolution,
    strategy: PriceStrategy
  ) {
    try {
      const resolution = await resolvePriceMarket(strategy);
      await settlementService.resolveMarket(market.id, resolution.result, {
        sources: resolution.sources,
        confidence: resolution.confidence,
      });
      logger.info(
        { marketId: market.id, result: resolution.result },
        "Price market resolved"
      );
    } catch (error) {
      logger.error({ marketId: market.id, error }, "Price resolution failed");
      return resolveWithAI(market);
    }
  }

  async function handleSportsResolution(
    market: MarketForResolution,
    strategy: SportsStrategy
  ) {
    try {
      const resolution = await resolveSportsMarket(strategy);
      if (resolution.result === "INVALID") {
        return resolveWithAI(market);
      }
      await settlementService.resolveMarket(market.id, resolution.result, {
        sources: resolution.sources,
        confidence: resolution.confidence,
      });
      logger.info(
        { marketId: market.id, result: resolution.result },
        "Sports market resolved"
      );
    } catch (error) {
      logger.error({ marketId: market.id, error }, "Sports resolution failed");
      return resolveWithAI(market);
    }
  }

  async function handleWebSearchResolution(
    market: MarketForResolution,
    strategy: WebSearchStrategy
  ) {
    try {
      const resolution = await resolveWebSearchMarket(
        aiClient,
        {
          title: market.title,
          description: market.description,
          category: market.category,
          resolutionCriteria: market.resolutionCriteria,
        },
        strategy
      );
      await settlementService.resolveMarket(market.id, resolution.result, {
        sources: resolution.sources,
        confidence: resolution.confidence,
      });
      logger.info(
        { marketId: market.id, result: resolution.result },
        "Web search market resolved"
      );
    } catch (error) {
      logger.error({ marketId: market.id, error }, "Web search failed");
      return resolveWithAI(
        market,
        strategy.searchQuery,
        strategy.successIndicators
      );
    }
  }

  function dispatchResolution(market: MarketForResolution) {
    const strategy = market.resolutionStrategy;

    if (!strategy) {
      logger.info(
        { marketId: market.id },
        "No resolution strategy, using AI fallback"
      );
      return resolveWithAI(market);
    }

    logger.info(
      { marketId: market.id, strategyType: strategy.type },
      "Executing resolution strategy"
    );

    switch (strategy.type) {
      case "PRICE":
        return handlePriceResolution(market, strategy);
      case "SPORTS":
        return handleSportsResolution(market, strategy);
      case "WEB_SEARCH":
        return handleWebSearchResolution(market, strategy);
      default:
        logger.warn(
          {
            marketId: market.id,
            strategyType: (strategy as { type: string }).type,
          },
          "Unknown strategy type, falling back to AI"
        );
        return resolveWithAI(market);
    }
  }

  async function resolveWithAI(
    market: MarketForResolution,
    searchHint?: string,
    successIndicators?: string[]
  ) {
    logger.info(
      { marketId: market.id, title: market.title },
      "Resolving market with AI"
    );

    const criteriaContext = market.resolutionCriteria
      ? `Resolution criteria: ${market.resolutionCriteria}`
      : "Use the market description to determine the outcome.";

    const searchContext = searchHint
      ? `\nSearch for: "${searchHint}"\nLook for these indicators of YES outcome: ${successIndicators?.join(", ") ?? "confirmation of the event"}`
      : "";

    const prompt = `You are resolving a prediction market. Analyze the available information and determine the outcome.

Market Title: ${market.title}
Market Description: ${market.description}

${criteriaContext}${searchContext}

Based on the current date and available information, determine if the market outcome is:
- YES: The predicted event happened/is true
- NO: The predicted event did not happen/is false
- INVALID: Cannot be determined or the market is unclear

Provide your analysis with confidence level (0-100) and reasoning.`;

    const model = aiClient.getModel({
      provider: "google",
      modelId: "gemini-2.5-flash",
    });

    const response = await aiClient.generateText({
      model,
      output: Output.object({ schema: MarketResolutionSchema }),
      prompt,
    });

    const { result, confidence, reasoning, sources } = response.output;

    logger.info(
      {
        marketId: market.id,
        result,
        confidence,
        reasoning: reasoning.substring(0, 100),
      },
      "AI resolution complete"
    );

    await settlementService.resolveMarket(market.id, result, {
      sources: sources.map((s) => ({ url: s.url, snippet: s.snippet })),
      confidence,
    });

    logger.info({ marketId: market.id, result }, "Market resolved and settled");
  }

  return { close: () => worker.close() };
}
