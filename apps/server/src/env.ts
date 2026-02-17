import { Environment } from "@yoda.fun/shared/services";
import { z } from "zod";

const ETH_PRIVATE_KEY_REGEX = /^0x[a-fA-F0-9]{64}$/;

export const envSchema = z.object({
  APP_ENV: Environment,
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  // S3/MinIO config
  S3_ENDPOINT: z.url(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string(),
  // PostHog analytics
  POSTHOG_API_KEY: z.string().optional(),
  // Reown (WalletConnect)
  REOWN_PROJECT_ID: z.string(),
  // Server signing key (also FHEVM fallback)
  YODA_AGENT_PRIVATE_KEY: z
    .custom<`0x${string}`>()
    .refine((val) => val.startsWith("0x"), {
      message: "YODA_AGENT_PRIVATE_KEY must start with 0x",
    })
    .refine((val) => ETH_PRIVATE_KEY_REGEX.test(val), {
      message: "YODA_AGENT_PRIVATE_KEY must be 64 hex characters",
    }),
  // FHEVM (Sepolia) — uses YODA_AGENT_PRIVATE_KEY by default
  FHEVM_PRIVATE_KEY: z
    .custom<`0x${string}`>()
    .refine((val) => ETH_PRIVATE_KEY_REGEX.test(val))
    .optional(),
  FHEVM_RPC_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
