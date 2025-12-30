import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq, sql } from "@yoda.fun/db/drizzle";
import type { MarketId, MediaId } from "@yoda.fun/shared/typeid";

export interface ImageServiceDeps {
  db: Database;
}

export function createImageService(deps: ImageServiceDeps) {
  const { db } = deps;

  async function findReusableImage(tags: string[]): Promise<MediaId | null> {
    if (!tags.length) {
      return null;
    }

    const tagsArray = sql`ARRAY[${sql.join(
      tags.map((t) => sql`${t}`),
      sql.raw(",")
    )}]::text[]`;

    const match = await db.query.media.findFirst({
      where: and(
        eq(DB_SCHEMA.media.type, "market_image"),
        eq(DB_SCHEMA.media.status, "processed"),
        sql`${DB_SCHEMA.media.tags} && ${tagsArray}`
      ),
      orderBy: desc(DB_SCHEMA.media.createdAt),
    });

    if (!match) {
      return null;
    }

    return match.id as MediaId;
  }

  /**
   * Create a pending media record to get the mediaId before uploading.
   * The mediaId is used as the S3 key for unified naming (med_xxx.webp).
   */
  async function createPendingMedia(
    tags: string[],
    prompt: string
  ): Promise<MediaId> {
    const [inserted] = await db
      .insert(DB_SCHEMA.media)
      .values({
        type: "market_image",
        source: "replicate",
        status: "pending",
        tags,
        metadata: { prompt },
      })
      .returning();

    if (!inserted) {
      throw new Error("Failed to insert media record");
    }

    return inserted.id;
  }

  /**
   * Mark media as processed after successful upload.
   * S3 keys are derived from mediaId at runtime, not stored.
   */
  async function markMediaProcessed(
    mediaId: MediaId,
    sourceUrl: string
  ): Promise<void> {
    await db
      .update(DB_SCHEMA.media)
      .set({
        sourceUrl,
        status: "processed",
      })
      .where(eq(DB_SCHEMA.media.id, mediaId));
  }

  async function linkMediaToMarket(
    marketId: MarketId,
    mediaId: MediaId
  ): Promise<void> {
    await db
      .update(DB_SCHEMA.market)
      .set({ mediaId })
      .where(eq(DB_SCHEMA.market.id, marketId));
  }

  return {
    findReusableImage,
    createPendingMedia,
    markMediaProcessed,
    linkMediaToMarket,
  };
}

export type ImageService = ReturnType<typeof createImageService>;
