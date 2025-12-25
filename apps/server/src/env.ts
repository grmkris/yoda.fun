import { Environment } from "@yoda.fun/shared/services";
import { z } from "zod";

export const envSchema = z.object({
  APP_ENV: Environment,
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  // AI config
  XAI_API_KEY: z.string(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  EXA_API_KEY: z.string().optional(),
  // Redis/Queue config
  REDIS_URL: z.string().url(),
  // S3/MinIO config
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string(),
  // PostHog analytics
  POSTHOG_API_KEY: z.string().optional(),
  // Blockchain/Treasury
  TREASURY_PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
});

export const env = envSchema.parse(process.env);
