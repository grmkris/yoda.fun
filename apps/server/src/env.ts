import { Environment } from "@yoda.fun/shared/services";
import { z } from "zod";

const NetworkSchema = z.enum(["base", "base-sepolia"]).default("base-sepolia");

export const envSchema = z.object({
  APP_ENV: Environment,
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  // x402 deposit config
  DEPOSIT_WALLET_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  NETWORK: NetworkSchema,
  // AI config for market resolution
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  // Redis/Queue config
  REDIS_URL: z.string().url().optional(),
  // Enable market resolution worker (requires REDIS_URL and GOOGLE_GEMINI_API_KEY)
  ENABLE_RESOLUTION_WORKER: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  // Enable market generation (requires REDIS_URL and GOOGLE_GEMINI_API_KEY)
  ENABLE_MARKET_GENERATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  // Cron pattern for market generation (default: every 6 hours)
  MARKET_GENERATION_CRON: z.string().default("0 */6 * * *"),
  // Number of markets to generate per run
  MARKET_GENERATION_COUNT: z
    .string()
    .default("5")
    .transform((v) => Number.parseInt(v, 10)),
  // PostHog analytics
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
});

export const env = envSchema.parse(process.env);

export type Network = z.infer<typeof NetworkSchema>;
