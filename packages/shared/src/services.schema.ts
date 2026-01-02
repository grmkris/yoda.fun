import { z } from "zod";

export const ENVIRONMENTS = ["dev", "prod"] as const;

export const Environment = z.enum(ENVIRONMENTS);
export type Environment = z.infer<typeof Environment>;

export const SERVICE_URLS: Record<
  Environment,
  {
    auth: string;
    authInternal: string;
    api: string;
    apiInternal: string;
    web: string;
    cookieDomain: string;
    siweDomain: string;
    storageUrl: string;
    publicBucket: string;
    publicStorageUrl: string;
    posthog: string;
    posthogAssets: string;
    posthogUi: string;
  }
> = {
  dev: {
    auth: "http://localhost:4200/auth",
    authInternal: "http://localhost:4200",
    api: "http://localhost:4200",
    apiInternal: "http://localhost:4200",
    web: "https://localhost:4201",
    cookieDomain: "localhost",
    siweDomain: "localhost",
    storageUrl: "https://storage.yoda.fun",
    publicBucket: "yoda-fun-public",
    publicStorageUrl: "https://storage.yoda.fun/yoda-fun-public",
    posthog: "https://eu.i.posthog.com",
    posthogAssets: "https://eu-assets.i.posthog.com",
    posthogUi: "https://eu.posthog.com",
  },
  prod: {
    auth: "https://yoda.fun/api",
    authInternal: "http://api.internal:4200",
    api: "https://yoda.fun/api",
    apiInternal: "http://api.internal:4200",
    web: "https://yoda.fun",
    cookieDomain: ".yoda.fun",
    siweDomain: ".yoda.fun",
    storageUrl: "https://storage.yoda.fun",
    publicBucket: "yoda-fun-public",
    publicStorageUrl: "https://storage.yoda.fun/yoda-fun-public",
    posthog: "https://eu.i.posthog.com",
    posthogAssets: "https://eu-assets.i.posthog.com",
    posthogUi: "https://eu.posthog.com",
  },
} as const;
