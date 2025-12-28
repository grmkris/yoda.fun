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

  async function createImageMedia(
    imageUrl: string,
    tags: string[],
    prompt: string
  ): Promise<MediaId> {
    const [inserted] = await db
      .insert(DB_SCHEMA.media)
      .values({
        type: "market_image",
        source: "replicate",
        status: "processed",
        sourceUrl: imageUrl,
        tags,
        metadata: { prompt },
      })
      .returning();

    if (!inserted) {
      throw new Error("Failed to insert media record");
    }

    return inserted.id;
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
    createImageMedia,
    linkMediaToMarket,
  };
}

export type ImageService = ReturnType<typeof createImageService>;
