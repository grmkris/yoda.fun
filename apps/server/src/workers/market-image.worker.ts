import { generateMarketImageBuffer } from "@yoda.fun/ai/image-generation";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import { processMarketImage } from "@yoda.fun/markets/image-processing";
import type { QueueClient } from "@yoda.fun/queue";
import type { StorageClient } from "@yoda.fun/storage";

export interface MarketImageWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  storage: StorageClient;
  replicateApiKey: string;
}

export function createMarketImageWorker(config: MarketImageWorkerConfig): {
  close: () => Promise<void>;
} {
  const { queue, db, logger, storage, replicateApiKey } = config;

  logger.info({ msg: "Starting market image worker" });

  const worker = queue.createWorker<"generate-market-image">(
    "generate-market-image",
    async (job) => {
      const { marketId, title, description, category } = job;

      logger.info({ marketId, title }, "Generating market image");

      const imageBuffer = await generateMarketImageBuffer(
        { title, description, category },
        { replicateApiKey }
      );

      if (!imageBuffer) {
        logger.warn({ marketId }, "Image generation returned null");
        return { success: false, marketId };
      }

      const { imageUrl, thumbnailUrl } = await processMarketImage(imageBuffer, {
        storage,
      });

      await db
        .update(DB_SCHEMA.market)
        .set({ imageUrl, thumbnailUrl, status: "LIVE" })
        .where(eq(DB_SCHEMA.market.id, marketId));

      logger.info(
        { marketId, imageUrl, thumbnailUrl },
        "Market image processed"
      );
      return { success: true, marketId, imageUrl, thumbnailUrl };
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
