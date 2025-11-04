import { RedisClient } from "bun";
import { RedisMemoryServer } from "redis-memory-server";

/**
 * Creates an in-memory Redis server for testing
 */
export async function createTestRedisSetup() {
  // Create and start the Redis memory server
  const redisServer = await RedisMemoryServer.create();

  // Get the connection URI
  const host = await redisServer.getHost();
  const port = await redisServer.getPort();
  const uri = `redis://${host}:${port}`;

  // Create a Redis client
  const client = new RedisClient(uri);

  // Create cleanup function
  const shutdown = async () => {
    // Bun's RedisClient doesn't have quit, it's auto-closed
    await redisServer.stop();
  };

  return {
    client,
    redisServer,
    host,
    port,
    uri,
    shutdown,
  };
}
