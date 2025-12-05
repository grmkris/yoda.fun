import { Environment } from "@yoda.fun/shared/services";
import { z } from "zod";

export const envSchema = z.object({
  APP_ENV: Environment,
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  // AI config for market resolution
  GOOGLE_GEMINI_API_KEY: z.string(),
  // Redis/Queue config
  REDIS_URL: z.string().url(),
  // S3/MinIO config
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string(),
  // PostHog analytics
  POSTHOG_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
