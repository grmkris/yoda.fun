import { RedisClient } from "bun";

export interface RedisConfig {
  url: string;
}

export const createRedisClient = (config: RedisConfig) =>
  new RedisClient(config.url);
