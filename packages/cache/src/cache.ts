// biome-ignore lint/performance/noBarrelFile: Package public API
export {
  type Cache,
  type CacheEntry,
  type CachifiedOptions,
  cachified,
  totalTtl,
} from "@epic-web/cachified";

export { createRedisCache, type RedisCache } from "./adapters/redis";
