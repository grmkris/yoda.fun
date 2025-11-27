import { Environment } from "@yoda.fun/shared/services";
import { z } from "zod";

export const envSchema = z.object({
  APP_ENV: Environment,
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  // AI config for market resolution
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  // Redis/Queue config
  REDIS_URL: z.string().url().optional(),
  // PostHog analytics
  POSTHOG_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
