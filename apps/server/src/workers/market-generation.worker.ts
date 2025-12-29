import type { AiClient } from "@yoda.fun/ai";
import { withTrace } from "@yoda.fun/ai/observability";
import type { Cache } from "@yoda.fun/cache";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import {
  generateAndInsertMarkets,
  getTrendingTopics,
} from "@yoda.fun/markets/generation";
import type { QueueClient } from "@yoda.fun/queue";
import { DEFAULT_TOPICS } from "@yoda.fun/shared/market.schema";

export interface MarketGenerationWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  aiClient: AiClient;
  cache: Cache;
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

const pickRandomFromArray = <T>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
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
  const { queue, db, logger, aiClient, cache } = config;

  logger.info({ msg: "Starting market generation worker" });

  const worker = queue.createWorker<"generate-market">(
    "generate-market",
    async (job) => {
      const { count, trigger } = job;
      const traceId = crypto.randomUUID();

      return await withTrace({ traceId }, async () => {
        logger.info(
          { count, trigger, traceId },
          "Processing market generation job"
        );

        const lastUsedIds = ((await cache.get("last-research-categories")) ??
          []) as string[];
        const unused = DEFAULT_TOPICS.filter(
          (t) => !lastUsedIds.includes(t.id)
        );

        const topics =
          unused.length >= 4
            ? pickRandomFromArray(unused, 4)
            : pickRandomFromArray(DEFAULT_TOPICS, 4);

        const topicsIds = topics.map((t) => t.id);
        await cache.set("last-research-categories", {
          value: topicsIds,
          metadata: {
            createdTime: Date.now(),
          },
        });

        logger.info(
          { categories: topics.map((t) => t.category) },
          "Researching trending topics"
        );

        const trendingTopics = await getTrendingTopics({
          aiClient,
          logger,
          config: { topics },
        });

        const { generated, inserted } = await generateAndInsertMarkets({
          db,
          aiClient,
          logger,
          input: {
            count,
            timeframe: getTimeframe(),
            trendingTopics,
          },
        });

        for (const market of inserted) {
          await queue.addJob("generate-market-image", {
            marketId: market.id,
            title: market.title,
            description: market.description ?? "",
            category: market.category ?? "other",
          });

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
      });
    },
    {
      onFailed: (job, error) => {
        logger.error({
          msg: "Market generation failed after all retries",
          count: job.count,
          trigger: job.trigger,
          error: error.message,
        });
        return Promise.resolve();
      },
    }
  );

  return { close: () => worker.close() };
}
