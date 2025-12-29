import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { isNotNull, or } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { S3Client } from "bun";

async function copyImageToPublic(
  key: string,
  privateS3: S3Client,
  publicS3: S3Client
): Promise<"migrated" | "skipped"> {
  const publicFile = publicS3.file(key);
  if (await publicFile.exists()) {
    return "skipped";
  }

  const privateFile = privateS3.file(key);
  if (!(await privateFile.exists())) {
    return "skipped";
  }

  const data = await privateFile.arrayBuffer();
  await publicS3.write(key, data, {
    type: key.endsWith(".webp") ? "image/webp" : "image/png",
  });
  return "migrated";
}

export async function migrateMarketImages(deps: {
  db: Database;
  privateS3: S3Client;
  publicS3: S3Client;
  logger: Logger;
}): Promise<void> {
  const { db, privateS3, publicS3, logger } = deps;

  logger.info({}, "Migration: Copying market images to public bucket");

  const markets = await db
    .select({
      id: DB_SCHEMA.market.id,
      title: DB_SCHEMA.market.title,
      imageUrl: DB_SCHEMA.market.imageUrl,
      thumbnailUrl: DB_SCHEMA.market.thumbnailUrl,
    })
    .from(DB_SCHEMA.market)
    .where(
      or(
        isNotNull(DB_SCHEMA.market.imageUrl),
        isNotNull(DB_SCHEMA.market.thumbnailUrl)
      )
    );

  if (markets.length === 0) {
    logger.info({}, "No markets with images to migrate");
    return;
  }

  logger.info({ count: markets.length }, "Found markets with images");

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const market of markets) {
    const keys = [market.imageUrl, market.thumbnailUrl].filter(
      (k): k is string => !!k
    );

    for (const key of keys) {
      try {
        const result = await copyImageToPublic(key, privateS3, publicS3);
        if (result === "migrated") {
          migrated++;
        } else {
          skipped++;
        }
      } catch (error) {
        logger.error({ key, error }, "Failed to migrate image");
        failed++;
      }
    }
  }

  logger.info(
    { migrated, skipped, failed },
    "Market image migration completed"
  );
}
