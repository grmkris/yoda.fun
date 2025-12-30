import type { MediaId } from "./typeid.schema";

export function getMediaS3Key(mediaId: MediaId): string {
  return `markets/${mediaId}.webp`;
}

export function getMediaThumbnailS3Key(mediaId: MediaId): string {
  return `markets/${mediaId}_thumb.webp`;
}
