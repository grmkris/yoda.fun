import type { AiClient } from "@yoda.fun/ai";
import { createMarketGenerationService } from "@yoda.fun/api/services/market-generation/market-generation-service";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { QueueClient } from "@yoda.fun/queue";

export interface MarketGenerationWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  aiClient: AiClient;
}

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

  const worker = queue.createWorker<"generate-market">(
    "generate-market",
    async (job) => {
      const { count, categories, trigger } = job;

      logger.info(
        { count, categories, trigger },
        "Processing market generation job"
      );

      // Generate and insert markets
      const { generated, inserted } =
        await marketGenerationService.generateAndInsertMarkets({
          count,
          categories,
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
