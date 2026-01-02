import type { AiClient } from "@yoda.fun/ai";
import {
  fetchImageBuffer,
  generateImagePromptWithTags,
  generateMarketImageWithPrompt,
} from "@yoda.fun/ai/image-generation";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import { WORKFLOW_MODELS } from "@yoda.fun/markets/config";
import { createImageService } from "@yoda.fun/markets/generation";
import { processMarketImage } from "@yoda.fun/markets/image-processing";
import type { QueueClient } from "@yoda.fun/queue";
import {
  getMediaS3Key,
  getMediaThumbnailS3Key,
} from "@yoda.fun/shared/media-utils";
import type { StorageClient } from "@yoda.fun/storage";

export interface MarketImageWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  storage: StorageClient;
  aiClient: AiClient;
  replicateApiKey: string;
}

export function createMarketImageWorker(config: MarketImageWorkerConfig): {
  close: () => Promise<void>;
} {
  const { queue, db, logger, storage, aiClient, replicateApiKey } = config;

  logger.info({ msg: "Starting market image worker" });

  const imageService = createImageService({ db });

  const worker = queue.createWorker<"generate-market-image">(
    "generate-market-image",
    async (job) => {
      const { marketId, title, description, category } = job;

      logger.info({ marketId, title }, "Processing market image");

      // Check if market already has an image
      const [market] = await db
        .select({
          mediaId: DB_SCHEMA.market.mediaId,
          imageUrl: DB_SCHEMA.market.imageUrl,
        })
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, marketId))
        .limit(1);

      if (market?.imageUrl) {
        logger.info({ marketId }, "Market already has image, skipping");
        return { success: true, marketId, imageUrl: market.imageUrl };
      }

      const { prompt, tags, reuseOk } = await generateImagePromptWithTags(
        { title, description, category },
        aiClient,
        WORKFLOW_MODELS.image.promptGen
      );

      logger.info(
        { marketId, tags, reuseOk },
        "Generated image prompt and tags"
      );

      let mediaId = reuseOk ? await imageService.findReusableImage(tags) : null;
      let reused = false;

      if (mediaId) {
        logger.info({ marketId, mediaId, tags }, "Reusing existing image");
        reused = true;
      } else {
        logger.info({ marketId }, "Generating new image via Replicate");

        // Create pending media first to get mediaId (used as S3 key)
        mediaId = await imageService.createPendingMedia(tags, prompt);
        logger.info({ marketId, mediaId }, "Created pending media record");

        const sourceUrl = await generateMarketImageWithPrompt(prompt, {
          replicateApiKey,
        });

        if (!sourceUrl) {
          logger.warn({ marketId, mediaId }, "Image generation returned null");
          return { success: false, marketId };
        }

        const imageBuffer = await fetchImageBuffer(sourceUrl);

        // Upload to S3 (keys derived from mediaId)
        await processMarketImage(imageBuffer, { storage, mediaId });

        // Mark media as processed
        await imageService.markMediaProcessed(mediaId, sourceUrl);

        logger.info({ marketId, mediaId, tags }, "Created new reusable image");
      }

      // Derive S3 keys from mediaId
      const imageUrl = getMediaS3Key(mediaId);
      const thumbnailUrl = getMediaThumbnailS3Key(mediaId);

      // Update market with media reference and URLs
      await db
        .update(DB_SCHEMA.market)
        .set({
          mediaId,
          imageUrl,
          thumbnailUrl,
          status: "LIVE",
        })
        .where(eq(DB_SCHEMA.market.id, marketId));

      logger.info(
        { marketId, mediaId, reused, tags },
        "Market image processed successfully"
      );

      return {
        success: true,
        marketId,
        mediaId,
        reused,
        imageUrl,
        thumbnailUrl,
      };
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
