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
import { createImageService } from "@yoda.fun/markets/generation";
import { processMarketImage } from "@yoda.fun/markets/image-processing";
import type { QueueClient } from "@yoda.fun/queue";
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

      // Generate prompt, tags, and reuse decision via AI
      const { prompt, tags, reuseOk } = await generateImagePromptWithTags(
        { title, description, category },
        aiClient
      );

      logger.info(
        { marketId, tags, reuseOk },
        "Generated image prompt and tags"
      );

      // Try to find reusable image if AI says it's ok to reuse
      let mediaId = reuseOk ? await imageService.findReusableImage(tags) : null;
      let reused = false;

      if (mediaId) {
        logger.info({ marketId, mediaId, tags }, "Reusing existing image");
        reused = true;
      } else {
        // Generate new image
        logger.info({ marketId }, "Generating new image via Replicate");

        // Use the AI-generated prompt (not buildImagePrompt fallback)
        const sourceUrl = await generateMarketImageWithPrompt(prompt, {
          replicateApiKey,
        });

        if (!sourceUrl) {
          logger.warn({ marketId }, "Image generation returned null");
          return { success: false, marketId };
        }

        // Fetch and process the image
        const imageBuffer = await fetchImageBuffer(sourceUrl);
        const { imageUrl: finalKey, thumbnailUrl: thumbnailKey } =
          await processMarketImage(imageBuffer, { storage });

        // Create media record with tags for future reuse
        mediaId = await imageService.createImageMedia(finalKey, tags, prompt);

        // Update media with processed keys
        await db
          .update(DB_SCHEMA.media)
          .set({ finalKey, thumbnailKey, status: "processed" })
          .where(eq(DB_SCHEMA.media.id, mediaId));

        logger.info({ marketId, mediaId, tags }, "Created new reusable image");
      }

      // Get the media record to get URLs
      const [media] = await db
        .select()
        .from(DB_SCHEMA.media)
        .where(eq(DB_SCHEMA.media.id, mediaId))
        .limit(1);

      // Update market with media reference and URLs
      await db
        .update(DB_SCHEMA.market)
        .set({
          mediaId,
          imageUrl: media?.finalKey ?? media?.sourceUrl,
          thumbnailUrl: media?.thumbnailKey,
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
        imageUrl: media?.finalKey ?? undefined,
        thumbnailUrl: media?.thumbnailKey ?? undefined,
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
