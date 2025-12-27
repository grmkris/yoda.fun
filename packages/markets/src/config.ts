export const MARKET_GENERATION = {
  BATCH_SIZE: 8,
  CRON: "*/30 * * * *",
} as const;

export const CATEGORY_DISTRIBUTION = {
  movies: 0.1,
  tv: 0.08,
  music: 0.08,
  celebrities: 0.08,
  gaming: 0.08,
  sports: 0.2,
  politics: 0.08,
  tech: 0.08,
  crypto: 0.05,
  viral: 0.07,
  memes: 0.05,
  weather: 0.02,
  other: 0.03,
} as const;

export const CRYPTO_DAILY_CAP = 12;
export const TRENDING_CACHE_TTL = 1800;
