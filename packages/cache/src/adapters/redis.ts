import { type Cache, type CacheEntry, totalTtl } from "@epic-web/cachified";

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    ex?: "EX",
    seconds?: number
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export function createRedisCache(redis: RedisLike): Cache {
  return {
    async get(key) {
      const value = await redis.get(key);
      if (!value) {
        return;
      }
      try {
        return JSON.parse(value) as CacheEntry;
      } catch {
        return;
      }
    },
    async set(key, entry) {
      const ttl = totalTtl(entry.metadata);
      const value = JSON.stringify(entry);
      if (ttl === Number.POSITIVE_INFINITY) {
        await redis.set(key, value);
      } else if (ttl > 0) {
        await redis.set(key, value, "EX", Math.ceil(ttl / 1000));
      }
    },
    async delete(key) {
      await redis.del(key);
    },
  };
}

export type RedisCache = ReturnType<typeof createRedisCache>;
