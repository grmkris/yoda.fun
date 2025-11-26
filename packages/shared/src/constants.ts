// Queue types (defined here to avoid circular deps with @yoda.fun/queue)
export type JobType = "resolve-market" | "generate-market";
export type RateLimitConfig = { max: number; duration: number };

// Worker Configuration
export const WORKER_CONFIG = {
  // Per-queue concurrency
  CONCURRENCY: {
    "resolve-market": 2, // Keep low - AI calls are expensive
    "generate-market": 1, // Single market generation at a time
  } satisfies Record<JobType, number>,
  // Per-queue rate limits
  RATE_LIMITS: {
    "resolve-market": { max: 10, duration: 60_000 }, // 10/min
    "generate-market": { max: 5, duration: 60_000 }, // 5/min - don't spam AI
  } satisfies Record<JobType, RateLimitConfig>,
} as const;

export const NUMERIC_CONSTANTS = {
  MAX_DELAY: 1000,
  validationLimits: {
    minStringLength: 1,
  },
  pagination: {
    minLimit: 1,
    maxLimit: 100,
    defaultLimit: 20,
  },
  swipe: {
    exitDistance: 1000,
    animationDuration: 300,
    dragElasticity: 0.7,
    scaleOnDrag: 1.05,
    exitScale: 0.8,
    stackScaleFactor: 0.05,
    stackOpacityFactor: 0.2,
    stackYOffset: 10,
    buttonSize: 60,
    buttonBorderWidth: 2,
    buttonScale: 1.1,
    iconSize: 32,
    iconStrokeWidth: 2.5,
    transitionDuration: 0.2,
    overlayOpacity: 0.3,
    disabledOpacity: 0.5,
    emptyStateHeight: 400,
    millisecondsPerSecond: 1000,
  },
};
