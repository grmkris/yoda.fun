import fs from "node:fs";
import { S3Client as BunS3Client } from "bun";
import S3rver from "s3rver";

/**
 * Generate a random port number between min and max
 */
const getRandomPort = (min = 10_000, max = 50_000) =>
  Math.floor(Math.random() * (max - min) + min);

/**
 * Initializes an S3rver server and returns a Bun S3 client connected to it
 */
export async function createTestS3Setup(bucketName: string) {
  // Set up the S3rver server
  const port = getRandomPort();
  const hostname = "localhost";

  // Create the S3rver instance
  const s3rver = new S3rver({
    port,
    silent: true,
    directory: "/tmp/s3rver-test",
    configureBuckets: [{ name: bucketName, configs: [] }],
  });

  // Start the server
  const server = await s3rver.run();

  // Create a Bun S3 client configured for the S3rver endpoint & bucket
  const endpoint = `http://${hostname}:${port}`;
  const bunClient = new BunS3Client({
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER",
    endpoint,
    bucket: bucketName,
  });

  // Create a method to shutdown the server
  const shutdown = async () => {
    await s3rver.close();
    fs.rmSync("/tmp/s3rver-test", { recursive: true, force: true });
  };

  return {
    client: bunClient,
    bunClient,
    s3rver,
    server,
    port,
    hostname,
    bucketName,
    shutdown,
  };
}
