import { z } from "zod";

export const ENVIRONMENTS = ["dev", "prod"] as const;

export const Environment = z.enum(ENVIRONMENTS);
export type Environment = z.infer<typeof Environment>;

export const SERVICE_URLS: Record<
  Environment,
  {
    auth: string;
    api: string;
    web: string;
    cookieDomain: string;
    storage: string;
  }
> = {
  dev: {
    auth: "http://localhost:3000",
    api: "http://localhost:3000",
    web: "http://localhost:3001",
    cookieDomain: "localhost",
    storage: "http://localhost:9000",
  },
  prod: {
    auth: "https://api.yoda.fun",
    api: "https://api.yoda.fun",
    web: "https://yoda.fun",
    cookieDomain: ".yoda.fun",
    storage: "https://storage.yoda.fun",
  },
} as const;
