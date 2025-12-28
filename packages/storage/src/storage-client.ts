import type { Logger } from "@yoda.fun/logger";
import { type Environment, SERVICE_URLS } from "@yoda.fun/shared/services";
import type { S3Client } from "bun";

export interface StorageConfig {
  s3Client: S3Client;
  publicS3Client?: S3Client;
  publicUrl?: string;
  env: Environment;
  logger?: Logger;
}

export interface UploadOptions {
  key: string;
  data: Buffer | Uint8Array | string;
  contentType?: string;
}

export interface DownloadOptions {
  key: string;
}

export interface DeleteOptions {
  key: string;
}

export interface ListOptions {
  prefix?: string;
  maxKeys?: number;
}

export interface SignedUrlOptions {
  key: string;
  expiresIn?: number; // seconds
}

/**
 * Storage client abstraction over S3
 * Provides high-level methods for common storage operations
 */
export function createStorageClient(config: StorageConfig) {
  const { s3Client, logger } = config;

  /**
   * Upload a file to storage
   */
  async function upload(options: UploadOptions): Promise<{ key: string }> {
    const { key, data, contentType } = options;

    try {
      logger?.debug({ msg: "Uploading file", key, contentType });

      await s3Client.write(key, data, {
        type: contentType,
      });

      logger?.info({ msg: "File uploaded successfully", key });

      return {
        key,
      };
    } catch (error) {
      logger?.error({ msg: "File upload failed", key, error });
      throw new Error(`Failed to upload file: ${key}`);
    }
  }

  /**
   * Download a file from storage
   */
  async function download(options: DownloadOptions): Promise<Blob> {
    const { key } = options;

    try {
      logger?.debug({ msg: "Downloading file", key });

      const file = await s3Client.file(key);
      const buf = new ArrayBuffer(file.size);
      const blob = new Blob([buf]);
      logger?.info({ msg: "File downloaded successfully", key });
      return blob;
    } catch (error) {
      logger?.error({ msg: "File download failed", key, error });
      throw new Error(`Failed to download file: ${key}`);
    }
  }

  /**
   * Delete a file from storage
   */
  async function deleteFile(options: DeleteOptions): Promise<void> {
    const { key } = options;

    try {
      logger?.debug({ msg: "Deleting file", key });

      await s3Client.delete(key);

      logger?.info({ msg: "File deleted successfully", key });
    } catch (error) {
      logger?.error({ msg: "File deletion failed", key, error });
      throw new Error(`Failed to delete file: ${key}`);
    }
  }

  /**
   * List files in storage
   */
  function listObjects(options: ListOptions = {}): string[] {
    const { prefix = "", maxKeys = 1000 } = options;

    try {
      logger?.debug({ msg: "Listing objects", prefix, maxKeys });

      // Note: Bun S3Client doesn't have a built-in list method
      // This would need to be implemented using the presign method or AWS SDK
      // For now, return empty array as placeholder
      logger?.warn({ msg: "List operation not yet implemented" });

      return []; // TODO: Implement
    } catch (error) {
      logger?.error({ msg: "List objects failed", prefix, error });
      throw new Error(`Failed to list objects with prefix: ${prefix}`);
    }
  }

  /**
   * Get a signed URL for temporary access
   */
  function getSignedUrl(options: SignedUrlOptions): string {
    const { key, expiresIn = 3600 } = options;

    try {
      logger?.debug({ msg: "Generating signed URL", key, expiresIn });

      const signedUrl = s3Client.presign(key, {
        expiresIn,
        endpoint: SERVICE_URLS[config.env].storageUrl,
      });

      logger?.info({ msg: "Signed URL generated", key });

      return signedUrl;
    } catch (error) {
      logger?.error({ msg: "Signed URL generation failed", key, error });
      throw new Error(`Failed to generate signed URL: ${key}`);
    }
  }

  /**
   * Get a presigned URL for uploading a file
   */
  function getUploadUrl(
    options: SignedUrlOptions & { contentType: string }
  ): string {
    const { key, expiresIn = 3600, contentType } = options;

    try {
      logger?.debug({
        msg: "Generating upload URL",
        key,
        expiresIn,
        contentType,
      });

      const uploadUrl = s3Client.presign(key, {
        endpoint: SERVICE_URLS[config.env].storageUrl,
        method: "PUT",
        expiresIn,
        type: contentType,
      });

      logger?.info({ msg: "Upload URL generated", key });

      return uploadUrl;
    } catch (error) {
      logger?.error({ msg: "Upload URL generation failed", key, error });
      throw new Error(`Failed to generate upload URL: ${key}`);
    }
  }

  /**
   * Check if a file exists
   */
  async function exists(key: string): Promise<boolean> {
    try {
      logger?.debug({ msg: "Checking file existence", key });

      const file = s3Client.file(key);
      const fileExists = await file.exists();

      logger?.debug({ msg: "File existence check", key, exists: fileExists });

      return fileExists;
    } catch (error) {
      logger?.error({ msg: "File existence check failed", key, error });
      return false;
    }
  }

  /**
   * Upload a file to the public bucket
   * Returns the S3 key (not URL)
   */
  async function uploadPublic(
    options: UploadOptions
  ): Promise<{ key: string }> {
    const { key, data, contentType } = options;

    if (!config.publicS3Client) {
      throw new Error("Public S3 client not configured");
    }

    try {
      logger?.debug({
        msg: "Uploading file to public bucket",
        key,
        contentType,
      });

      await config.publicS3Client.write(key, data, {
        type: contentType,
      });

      logger?.info({ msg: "File uploaded to public bucket", key });

      return { key };
    } catch (error) {
      logger?.error({ msg: "Public file upload failed", key, error });
      throw new Error(`Failed to upload file to public bucket: ${key}`);
    }
  }

  /**
   * Get a stable public URL for a key in the public bucket
   */
  function getPublicUrl(key: string): string {
    if (!config.publicUrl) {
      throw new Error("Public URL not configured");
    }
    return `${config.publicUrl}/${key}`;
  }

  return {
    upload,
    uploadPublic,
    download,
    delete: deleteFile,
    listObjects,
    getSignedUrl,
    getPublicUrl,
    getUploadUrl,
    exists,
  };
}

export type StorageClient = ReturnType<typeof createStorageClient>;
