import {
  getMediaS3Key,
  getMediaThumbnailS3Key,
} from "@yoda.fun/shared/media-utils";
import type { MediaId } from "@yoda.fun/shared/typeid";
import type { StorageClient } from "@yoda.fun/storage";
import sharp from "sharp";

interface BaseImageConfig {
  storage: StorageClient;
  webpQuality?: number;
}

export interface MarketImageConfig extends BaseImageConfig {
  mediaId: MediaId;
  thumbnailWidth?: number;
}

export interface AvatarImageConfig extends BaseImageConfig {}

const DEFAULT_WEBP_QUALITY = 85;
const DEFAULT_THUMBNAIL_WIDTH = 300;

export async function processMarketImage(
  imageBuffer: Buffer,
  config: MarketImageConfig
): Promise<void> {
  const quality = config.webpQuality ?? DEFAULT_WEBP_QUALITY;
  const thumbWidth = config.thumbnailWidth ?? DEFAULT_THUMBNAIL_WIDTH;
  const { mediaId } = config;

  const [webpBuffer, thumbnailBuffer] = await Promise.all([
    sharp(imageBuffer).webp({ quality }).toBuffer(),
    sharp(imageBuffer).resize(thumbWidth).webp({ quality }).toBuffer(),
  ]);

  const imageKey = getMediaS3Key(mediaId);
  const thumbnailKey = getMediaThumbnailS3Key(mediaId);

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
}

const DEFAULT_AVATAR_SIZE = 256;

export async function processAvatarImage(
  imageBuffer: Buffer,
  userId: string,
  config: AvatarImageConfig
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
