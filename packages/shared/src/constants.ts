// Queue types (defined here to avoid circular deps with @yoda.fun/queue)
export type JobType =
  | "resolve-market"
  | "generate-market"
  | "generate-market-image"
  | "process-avatar-image"
  | "process-withdrawal";
export interface RateLimitConfig {
  max: number;
  duration: number;
}

// Worker Configuration
export const WORKER_CONFIG = {
  // Per-queue concurrency
  CONCURRENCY: {
    "resolve-market": 4,
    "generate-market": 2,
    "generate-market-image": 1,
    "process-avatar-image": 2,
    "process-withdrawal": 1,
  } satisfies Record<JobType, number>,
  // Per-queue rate limits (optimized for Gemini API limits)
  RATE_LIMITS: {
    "resolve-market": { max: 30, duration: 60_000 },
    "generate-market": { max: 50, duration: 60_000 },
    "generate-market-image": { max: 5, duration: 60_000 },
    "process-avatar-image": { max: 30, duration: 60_000 },
    "process-withdrawal": { max: 30, duration: 60_000 },
  } satisfies Record<JobType, RateLimitConfig>,
} as const;

// Network types
export type Network = "base" | "base-sepolia";

// Environment-specific configuration
export const ENV_CONFIG = {
  dev: {
    network: "base-sepolia" as const,
    depositWalletAddress: "0x81d786b35f3ea2f39aa17cb18d9772e4ecd97206" as const,
  },
  prod: {
    network: "base" as const,
    depositWalletAddress: "0x81d786b35f3ea2f39aa17cb18d9772e4ecd97206" as const,
  },
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

// Points economy constants
export const POINTS_CONFIG = {
  // Starting balance for new users
  startingPoints: 30,
  // Daily points (tap to claim)
  dailyPoints: 5,
  // Vote costs
  voteCost: 3, // YES/NO costs 3 points
  skipCost: 1, // SKIP costs 1 point after free skips
  // Free skips per day
  freeSkipsPerDay: 3,
  // Correct prediction returns this many points (break even)
  correctReturn: 3,
} as const;

// Point pack tiers for USDC purchase
export const POINT_PACKS = [
  { tier: "starter", usdc: 5, points: 50 },
  { tier: "standard", usdc: 10, points: 120 },
  { tier: "pro", usdc: 20, points: 280 },
  { tier: "whale", usdc: 50, points: 800 },
] as const;

export type PointPackTier = (typeof POINT_PACKS)[number]["tier"];
