import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq, like, or } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import {
  getMediaS3Key,
  getMediaThumbnailS3Key,
} from "@yoda.fun/shared/media-utils";
import type { S3Client } from "bun";

interface MigrationDeps {
  db: Database;
  privateS3: S3Client;
  publicS3: S3Client;
  logger: Logger;
}

async function copyS3FileIfExists(
  s3: S3Client,
  oldKey: string | null,
  newKey: string
): Promise<boolean> {
  if (!oldKey || oldKey === newKey) {
    return false;
  }
  const file = s3.file(oldKey);
  if (!(await file.exists())) {
    return false;
  }
  const data = await file.arrayBuffer();
  await s3.write(newKey, data, { type: "image/webp" });
  return true;
}

/**
 * Migrates mig_ image keys to med_ (using mediaId).
 * This unifies S3 keys to match the media record IDs.
 */
export async function migrateMarketImages(deps: MigrationDeps): Promise<void> {
  const { db, publicS3, logger } = deps;

  logger.info({}, "Migration: Renaming mig_ images to med_");

  const markets = await db
    .select({
      id: DB_SCHEMA.market.id,
      mediaId: DB_SCHEMA.market.mediaId,
      imageUrl: DB_SCHEMA.market.imageUrl,
      thumbnailUrl: DB_SCHEMA.market.thumbnailUrl,
    })
    .from(DB_SCHEMA.market)
    .where(
      or(
        like(DB_SCHEMA.market.imageUrl, "%mig_%"),
        like(DB_SCHEMA.market.thumbnailUrl, "%mig_%")
      )
    );

  if (markets.length === 0) {
    logger.info({}, "No markets with mig_ images found, migration complete");
    return;
  }

  logger.info({ count: markets.length }, "Found markets with mig_ images");

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const market of markets) {
    if (!market.mediaId) {
      logger.warn({ marketId: market.id }, "Market has no mediaId, skipping");
      skipped++;
      continue;
    }

    try {
      const newImageKey = getMediaS3Key(market.mediaId);
      const newThumbKey = getMediaThumbnailS3Key(market.mediaId);

      await copyS3FileIfExists(publicS3, market.imageUrl, newImageKey);
      await copyS3FileIfExists(publicS3, market.thumbnailUrl, newThumbKey);

      await db
        .update(DB_SCHEMA.market)
        .set({ imageUrl: newImageKey, thumbnailUrl: newThumbKey })
        .where(eq(DB_SCHEMA.market.id, market.id));

      logger.debug(
        { marketId: market.id, newImageKey },
        "Migrated market image"
      );
      migrated++;
    } catch (error) {
      logger.error({ marketId: market.id, error }, "Failed to migrate market");
      failed++;
    }
  }

  logger.info(
    { migrated, skipped, failed },
    "mig_ to med_ migration completed"
  );
}
