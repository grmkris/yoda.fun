import type { AiClient } from "@yoda.fun/ai";
import { createMarketGenerationService } from "@yoda.fun/api/services/market-generation-service";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { QueueClient } from "@yoda.fun/queue";
import type { GenerateMarketJob } from "@yoda.fun/queue/jobs/generate-market-job";
import type { StorageClient } from "@yoda.fun/storage";

export interface MarketGenerationWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  aiClient: AiClient;
  storage?: StorageClient;
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
  const { queue, db, logger, aiClient, storage } = config;

  const marketGenerationService = createMarketGenerationService({
    deps: { db, logger, aiClient, storage },
  });

  logger.info({ msg: "Starting market generation worker" });

  const worker = queue.createWorker<"generate-market">(
    "generate-market",
    async (job: GenerateMarketJob) => {
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

      // Schedule resolution jobs for each new market
      for (const market of inserted) {
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
