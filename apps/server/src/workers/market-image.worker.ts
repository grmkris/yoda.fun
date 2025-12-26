import { generateMarketImage } from "@yoda.fun/ai/image-generation";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { QueueClient } from "@yoda.fun/queue";
import type { MarketId } from "@yoda.fun/shared/typeid";
import type { StorageClient } from "@yoda.fun/storage";

export interface MarketImageWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  storage: StorageClient;
  googleApiKey: string;
}

export function createMarketImageWorker(config: MarketImageWorkerConfig): {
  close: () => Promise<void>;
} {
  const { queue, db, logger, storage, googleApiKey } = config;

  logger.info({ msg: "Starting market image worker" });

  const worker = queue.createWorker<"generate-market-image">(
    "generate-market-image",
    async (job) => {
      const { marketId, title, description, category } = job;

      logger.info({ marketId, title }, "Generating market image");

      const imageKey = await generateMarketImage(
        { title, description, category },
        { googleApiKey, storage }
      );

      if (imageKey) {
        await db
          .update(DB_SCHEMA.market)
          .set({ imageUrl: imageKey, status: "ACTIVE" })
          .where(eq(DB_SCHEMA.market.id, marketId as MarketId));

        logger.info({ marketId, imageKey }, "Market image generated");
        return { success: true, marketId, imageUrl: imageKey };
      }

      logger.warn({ marketId }, "Image generation returned null");
      return { success: false, marketId };
    },
    {
      onFailed: (job, error) => {
        logger.error({
          msg: "Image generation failed after all retries",
          marketId: job.marketId,
          error: error.message,
        });
        return Promise.resolve();
      },
    }
  );

  return { close: () => worker.close() };
}
