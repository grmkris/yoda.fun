import { RedisClient } from "bun";

export type RedisConfig = {
  url: string;
};

export const createRedisClient = (config: RedisConfig) =>
  new RedisClient(config.url);
