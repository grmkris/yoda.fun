/**
 * MinIO Setup Function
 *
 * Creates the required S3 bucket for the application if it doesn't exist.
 * Called during server startup to initialize MinIO storage.
 */

import type { Logger } from "@yoda.fun/logger";
import type { S3Client } from "bun";

// Bun global type declaration
declare const Bun: {
  spawn: (
    command: string[],
    options?: {
      stdout?: "pipe" | "inherit" | "ignore";
      stderr?: "pipe" | "inherit" | "ignore";
    }
  ) => {
    stdout: ReadableStream;
    stderr: ReadableStream;
    exited: Promise<number>;
  };
};

export type MinIOSetupConfig = {
  s3Client: S3Client;
  endpoint: string;
  bucket: string;
  logger: Logger;
};

/**
 * Checks if a bucket exists by attempting to write a test file
 */
async function checkBucketExists(
  s3Client: S3Client,
  bucket: string,
  logger: Logger
): Promise<boolean> {
  try {
    const testKey = ".capbet-healthcheck";
    await s3Client.write(testKey, "ok", { type: "text/plain" });
    logger.info({ bucket }, "Bucket already exists and is accessible");
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("NoSuchBucket") ||
      errorMessage.includes("404") ||
      errorMessage.includes("not found")
    ) {
      logger.info({ bucket }, "Bucket does not exist yet");
    } else {
      logger.warn(
        { error: errorMessage },
        "Unexpected error checking bucket existence, will attempt to create it"
      );
    }
    return false;
  }
}

/**
 * Creates a bucket using docker exec with mc CLI inside MinIO container
 */
async function createBucket(bucket: string, logger: Logger): Promise<void> {
  logger.info({ bucket }, "Creating bucket...");

  try {
    // Use docker exec to run mc command inside the MinIO container
    const proc = Bun.spawn(
      [
        "docker",
        "exec",
        "capbet-minio",
        "mc",
        "mb",
        `/data/${bucket}`,
        "--ignore-existing",
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(proc.stdout).text();
    const errorOutput = await new Response(proc.stderr).text();
    await proc.exited;

    if (output || errorOutput) {
      logger.info({ output, errorOutput }, "mc command output");
    }

    logger.info({ bucket }, "Successfully created bucket (or already exists)");
  } catch (error) {
    logger.warn(
      { error },
      "Failed to create bucket using docker exec, bucket may already exist"
    );
    // Don't throw - bucket might already exist or MinIO might be configured differently
  }
}

/**
 * Verifies that a bucket is accessible by writing a test file
 */
async function verifyBucketAccess(
  s3Client: S3Client,
  bucket: string,
  logger: Logger
): Promise<void> {
  try {
    const testKey = ".capbet-healthcheck";
    await s3Client.write(testKey, "ok", { type: "text/plain" });
    logger.info({ bucket }, "Bucket verified and accessible");
  } catch (error) {
    logger.error({ error }, "Failed to verify bucket after creation");
    throw new Error("Bucket created but not accessible - check permissions");
  }
}

/**
 * Logs troubleshooting information for connection errors
 */
function logTroubleshooting(
  error: unknown,
  endpoint: string,
  bucket: string,
  logger: Logger
): void {
  if (
    error instanceof Error &&
    (error.message.includes("ECONNREFUSED") ||
      error.message.includes("fetch failed"))
  ) {
    logger.error("Troubleshooting:");
    logger.error("1. Make sure MinIO is running: docker ps | grep minio");
    logger.error("2. Start services: docker-compose up -d");
    logger.error(`3. Check MinIO health: curl ${endpoint}/minio/health/live`);
    logger.error(
      "4. If MinIO is running but bucket creation fails, create it manually:"
    );
    logger.error(
      `   curl -X PUT "http://localhost:9000/${bucket}" --aws-sigv4 "aws:amz:auto:s3" --user "minioadmin:minioadmin"`
    );
  }
}

// TODO do this before createAPp i think...
export async function setupMinIO(config: MinIOSetupConfig): Promise<void> {
  const { s3Client, endpoint, bucket, logger } = config;

  logger.info("Starting MinIO setup...");
  logger.info({ bucket, endpoint }, "MinIO configuration");

  try {
    logger.info("Checking if bucket exists...");
    const bucketExists = await checkBucketExists(s3Client, bucket, logger);
    if (bucketExists) {
      logger.info("MinIO setup complete - nothing to do");
      return;
    }

    await createBucket(bucket, logger);
    await verifyBucketAccess(s3Client, bucket, logger);

    logger.info(
      {
        console: endpoint.replace(":9000", ":9001"),
      },
      "Note: You may want to set bucket access policy via MinIO Console"
    );
    logger.info("MinIO setup complete");
  } catch (error) {
    logger.error({ error }, "MinIO setup failed");
    logTroubleshooting(error, endpoint, bucket, logger);
    throw error;
  }
}
