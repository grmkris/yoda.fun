import type { AiClient } from "@yoda.fun/ai";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import {
  createMarketGenerationService,
  getDistributionGuidance,
  getTrendingTopics,
} from "@yoda.fun/markets/generation";
import type { QueueClient } from "@yoda.fun/queue";

export interface MarketGenerationWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  aiClient: AiClient;
}

const getTimeframe = () => {
  const random = Math.random();
  if (random < 0.33) {
    return "immediate";
  }
  if (random < 0.66) {
    return "short";
  }
  return "medium";
};

/**
 * Create and start the market generation worker
 * Processes scheduled and manual market generation jobs
 */
export function createMarketGenerationWorker(
  config: MarketGenerationWorkerConfig
): {
  close: () => Promise<void>;
} {
  const { queue, db, logger, aiClient } = config;

  const marketGenerationService = createMarketGenerationService({
    db,
    logger,
    aiClient,
  });

  logger.info({ msg: "Starting market generation worker" });

  // Cache trending topics (refresh every 30 min)
  let cachedTrendingTopics: Awaited<ReturnType<typeof getTrendingTopics>> = [];
  let lastTrendingFetch = 0;
  const TRENDING_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  const worker = queue.createWorker<"generate-market">(
    "generate-market",
    async (job) => {
      const { count, categories, trigger } = job;

      logger.info(
        { count, categories, trigger },
        "Processing market generation job"
      );

      // For scheduled jobs, use soft distribution guidance
      let distributionGuidance:
        | Awaited<ReturnType<typeof getDistributionGuidance>>
        | undefined;
      if (trigger === "scheduled") {
        distributionGuidance = await getDistributionGuidance(db);
        logger.info(
          { suggested: distributionGuidance.suggested },
          "Using distribution guidance"
        );
      }

      // Fetch trending topics (with caching)
      const now = Date.now();
      if (now - lastTrendingFetch > TRENDING_CACHE_TTL) {
        try {
          logger.info({}, "Refreshing trending topics cache");
          cachedTrendingTopics = await getTrendingTopics({ aiClient, logger });
          lastTrendingFetch = now;
          logger.info(
            { topicCount: cachedTrendingTopics.length },
            "Trending topics refreshed"
          );
        } catch (error) {
          logger.warn(
            { error },
            "Failed to fetch trending topics, using cache"
          );
        }
      }

      // Generate and insert markets
      const { generated, inserted } =
        await marketGenerationService.generateAndInsertMarkets({
          count,
          categories,
          timeframe: getTimeframe(),
          curatedTopics: cachedTrendingTopics,
          distributionGuidance,
        });

      // Schedule resolution and image jobs for each new market
      for (const market of inserted) {
        // Queue image generation
        await queue.addJob("generate-market-image", {
          marketId: market.id,
          title: market.title,
          description: market.description ?? "",
          category: market.category ?? "other",
        });

        // Schedule resolution
        const delayMs =
          new Date(market.resolutionDeadline).getTime() - Date.now();

        if (delayMs > 0) {
          await queue.addJob(
            "resolve-market",
            { marketId: market.id },
            { delay: delayMs }
          );

          logger.info(
            {
              marketId: market.id,
              resolutionDeadline: market.resolutionDeadline,
              delayMs,
            },
            "Scheduled resolution job"
          );
        }
      }

      logger.info(
        {
          requested: count,
          generated: generated.markets.length,
          inserted: inserted.length,
          trigger,
        },
        "Market generation job completed"
      );

      return { success: true, marketsCreated: inserted.length };
    },
    {
      onFailed: (job, error) => {
        logger.error({
          msg: "Market generation failed after all retries",
          count: job.count,
          categories: job.categories,
          trigger: job.trigger,
          error: error.message,
        });
        return Promise.resolve();
      },
    }
  );

  return { close: () => worker.close() };
}
