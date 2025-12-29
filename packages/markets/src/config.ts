import type { AIModelConfig } from "@yoda.fun/ai";

export const WORKFLOW_MODELS = {
  generation: {
    markets: {
      provider: "xai",
      modelId: "grok-4-1-fast-reasoning",
    } satisfies AIModelConfig,
  },
  trending: {
    googleSearch: {
      provider: "google",
      modelId: "gemini-flash-latest",
    } satisfies AIModelConfig,
    xSearch: {
      provider: "xai",
      modelId: "grok-4-1-fast-non-reasoning",
    } satisfies AIModelConfig,
  },
  resolution: {
    webSearch: {
      provider: "google",
      modelId: "gemini-flash-latest",
    } satisfies AIModelConfig,
    analysis: {
      provider: "xai",
      modelId: "grok-4-1-fast-reasoning",
    } satisfies AIModelConfig,
    basic: {
      provider: "google",
      modelId: "gemini-flash-latest",
    } satisfies AIModelConfig,
  },
  image: {
    promptGen: {
      provider: "google",
      modelId: "gemini-flash-latest",
    } satisfies AIModelConfig,
  },
} as const satisfies Record<string, Record<string, AIModelConfig>>;

export const MARKET_GENERATION = {
  BATCH_SIZE: 8,
  CRON: "*/30 * * * *",
} as const;

export const CATEGORY_DISTRIBUTION = {
  movies: 0.13,
  tv: 0.08,
  music: 0.08,
  celebrities: 0.08,
  gaming: 0.08,
  sports: 0.22,
  politics: 0.08,
  tech: 0.08,
  viral: 0.07,
  memes: 0.05,
  weather: 0.02,
  other: 0.03,
} as const;

export const TRENDING_CACHE = {
  TTL_MS: 65 * 60 * 1000, // 65 min (guarantees 2 cache hits with 30 min cron)
  SWR_MS: 5 * 60 * 1000, // 5 min stale-while-revalidate
} as const;
