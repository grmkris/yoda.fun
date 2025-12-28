import { typeIdGenerator } from "@yoda.fun/shared/typeid";
import type { StorageClient } from "@yoda.fun/storage";
import sharp from "sharp";

export interface ProcessedImages {
  imageUrl: string;
  thumbnailUrl: string;
}

export interface ImageProcessingConfig {
  storage: StorageClient;
  webpQuality?: number;
  thumbnailWidth?: number;
}

const DEFAULT_WEBP_QUALITY = 85;
const DEFAULT_THUMBNAIL_WIDTH = 300;

export async function processMarketImage(
  imageBuffer: Buffer,
  config: ImageProcessingConfig
): Promise<ProcessedImages> {
  const quality = config.webpQuality ?? DEFAULT_WEBP_QUALITY;
  const thumbWidth = config.thumbnailWidth ?? DEFAULT_THUMBNAIL_WIDTH;
  const imageId = typeIdGenerator("marketImage");

  const [webpBuffer, thumbnailBuffer] = await Promise.all([
    sharp(imageBuffer).webp({ quality }).toBuffer(),
    sharp(imageBuffer).resize(thumbWidth).webp({ quality }).toBuffer(),
  ]);

  const imageKey = `markets/${imageId}.webp`;
  const thumbnailKey = `markets/${imageId}_thumb.webp`;

  await Promise.all([
    config.storage.uploadPublic({
      key: imageKey,
      data: webpBuffer,
      contentType: "image/webp",
    }),
    config.storage.uploadPublic({
      key: thumbnailKey,
      data: thumbnailBuffer,
      contentType: "image/webp",
    }),
  ]);

  return {
    imageUrl: imageKey,
    thumbnailUrl: thumbnailKey,
  };
}

const DEFAULT_AVATAR_SIZE = 256;

export async function processAvatarImage(
  imageBuffer: Buffer,
  userId: string,
  config: ImageProcessingConfig
): Promise<{ avatarKey: string }> {
  const quality = config.webpQuality ?? DEFAULT_WEBP_QUALITY;
  const key = `avatars/${userId}.webp`;

  const processedBuffer = await sharp(imageBuffer)
    .resize(DEFAULT_AVATAR_SIZE, DEFAULT_AVATAR_SIZE, { fit: "cover" })
    .webp({ quality })
    .toBuffer();

  await config.storage.uploadPublic({
    key,
    data: processedBuffer,
    contentType: "image/webp",
  });

  return { avatarKey: key };
}
