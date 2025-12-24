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
    siweDomain: string;
    storageUrl: string;
    posthog: string;
    posthogAssets: string;
    posthogUi: string;
  }
> = {
  dev: {
    auth: "http://localhost:4200",
    api: "http://localhost:4200",
    web: "https://localhost:4201",
    cookieDomain: "localhost",
    siweDomain: "localhost",
    storageUrl: "http://localhost:9100",
    posthog: "https://eu.i.posthog.com",
    posthogAssets: "https://eu-assets.i.posthog.com",
    posthogUi: "https://eu.posthog.com",
  },
  prod: {
    auth: "https://api.yoda.fun",
    api: "https://api.yoda.fun",
    web: "https://yoda.fun",
    cookieDomain: ".yoda.fun",
    siweDomain: ".yoda.fun",
    storageUrl: "https://storage.yoda.fun",
    posthog: "https://eu.i.posthog.com",
    posthogAssets: "https://eu-assets.i.posthog.com",
    posthogUi: "https://eu.posthog.com",
  },
} as const;
