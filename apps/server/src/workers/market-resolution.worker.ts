import type { AiClient } from "@yoda.fun/ai";
import { createLeaderboardService } from "@yoda.fun/api/services/leaderboard-service";
import { createSettlementService } from "@yoda.fun/api/services/settlement-service";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { QueueClient } from "@yoda.fun/queue";
import type { ResolveMarketJob } from "@yoda.fun/queue/jobs/resolve-market-job";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { z } from "zod";

export type MarketResolutionWorkerConfig = {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  aiClient: AiClient;
};

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

  // Create services for stats tracking
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

      // Get market details
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

      // Skip if already resolved
      if (market.result) {
        logger.info({ marketId }, "Market already resolved, skipping");
        return { success: true, marketId };
      }

      // Resolve with AI
      await resolveMarketWithAI(market);

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

  async function resolveMarketWithAI(market: {
    id: MarketId;
    title: string;
    description: string;
    resolutionCriteria: string | null;
    sourceUrls: string[] | null;
  }) {
    logger.info(
      { marketId: market.id, title: market.title },
      "Resolving market with AI"
    );

    // Build context for AI
    const sourcesContext = market.sourceUrls?.length
      ? `Source URLs to check: ${market.sourceUrls.join(", ")}`
      : "No specific sources provided.";

    const criteriaContext = market.resolutionCriteria
      ? `Resolution criteria: ${market.resolutionCriteria}`
      : "Use the market description to determine the outcome.";

    const prompt = `You are resolving a prediction market. Analyze the available information and determine the outcome.

Market Title: ${market.title}
Market Description: ${market.description}

${criteriaContext}
${sourcesContext}

Based on the current date and available information, determine if the market outcome is:
- YES: The predicted event happened/is true
- NO: The predicted event did not happen/is false
- INVALID: Cannot be determined or the market is unclear

Provide your analysis with confidence level (0-100) and reasoning.`;

    const model = aiClient.getModel({
      provider: "google",
      modelId: "gemini-2.5-flash",
    });

    const response = await aiClient.generateObject({
      model,
      schema: MarketResolutionSchema,
      prompt,
    });

    const { result, confidence, reasoning, sources } = response.object;

    logger.info(
      {
        marketId: market.id,
        result,
        confidence,
        reasoning: reasoning.substring(0, 100),
      },
      "AI resolution complete"
    );

    // Resolve and settle the market
    await settlementService.resolveMarket(market.id, result, {
      sources: sources.map((s) => ({
        url: s.url,
        snippet: s.snippet,
      })),
      confidence,
      aiModelUsed: "grok-3-mini",
    });

    logger.info({ marketId: market.id, result }, "Market resolved and settled");
  }

  return { close: () => worker.close() };
}
