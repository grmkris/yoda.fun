import { Environment } from "@yoda.fun/shared";
import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ENV: Environment,
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);
