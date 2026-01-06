import { Environment } from "@yoda.fun/shared/services";
import { z } from "zod";

const ETH_PRIVATE_KEY_REGEX = /^0x[a-fA-F0-9]{64}$/;

export const envSchema = z.object({
  APP_ENV: Environment,
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  // AI config
  XAI_API_KEY: z.string(),
  GOOGLE_GEMINI_API_KEY: z.string(),
  EXA_API_KEY: z.string(),
  // Redis/Queue config
  REDIS_URL: z.url(),
  // S3/MinIO config
  S3_ENDPOINT: z.url(),
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
  REPLICATE_API_KEY: z.string(),
  // Reown (WalletConnect)
  REOWN_PROJECT_ID: z.string(),
  // CDP (Coinbase Developer Platform) for x402
  CDP_API_KEY_ID: z.string(),
  CDP_API_KEY_SECRET: z.string(),
  // ERC-8004 Agent Identity
  YODA_AGENT_PRIVATE_KEY: z
    .custom<`0x${string}`>()
    .refine((val) => val.startsWith("0x"), {
      message: "YODA_AGENT_PRIVATE_KEY must start with 0x",
    })
    .refine((val) => ETH_PRIVATE_KEY_REGEX.test(val), {
      message: "YODA_AGENT_PRIVATE_KEY must be 64 hex characters",
    }),
  YODA_AGENT_ID: z.coerce.number(),
});

export const env = envSchema.parse(process.env);
