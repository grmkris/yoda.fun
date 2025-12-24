import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { S3Client as BunS3Client } from "bun";
import S3rver from "s3rver";

/**
 * Generate a random port number between min and max
 */
const getRandomPort = (min = 10_000, max = 50_000) =>
  Math.floor(Math.random() * (max - min) + min);

/**
 * Create a unique temp directory for test isolation
 */
const createTempDir = () => {
  const tmpDir = path.join(os.tmpdir(), `s3rver-test-${Date.now()}`);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
};

/**
 * Initializes an S3rver server and returns a Bun S3 client connected to it
 * Uses dynamic temp directories for test isolation
 */
export async function createTestS3Setup(bucketName: string) {
  const port = getRandomPort();
  const hostname = "localhost";
  const directory = createTempDir();

  const s3rver = new S3rver({
    port,
    silent: true,
    directory,
    configureBuckets: [{ name: bucketName, configs: [] }],
  });

  const server = await s3rver.run();

  const endpoint = `http://${hostname}:${port}`;
  const bunClient = new BunS3Client({
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER",
    endpoint,
    bucket: bucketName,
  });

  const shutdown = async () => {
    await s3rver.close();
    fs.rmSync(directory, { recursive: true, force: true });
  };

  return {
    client: bunClient,
    bunClient,
    s3rver,
    server,
    port,
    hostname,
    bucketName,
    endpoint,
    directory,
    shutdown,
  };
}
