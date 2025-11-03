import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { type Environment, SERVICE_URLS } from "@yoda.fun/shared/services";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
export type AuthConfig = {
  db: Database;
  appEnv: Environment;
  secret: string;
  baseURL?: string;
  trustedOrigins?: string[];
};

export const createAuth = (config: AuthConfig) => {
  const baseURL = config.baseURL ?? SERVICE_URLS[config.appEnv].auth;
  const trustedOrigins = config.trustedOrigins ?? [
    SERVICE_URLS[config.appEnv].web,
  ];

  return betterAuth<BetterAuthOptions>({
    database: drizzleAdapter(config.db, {
      provider: "pg",
      schema: DB_SCHEMA,
    }),
    secret: config.secret,
    baseURL,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
      crossSubDomainCookies: {
        enabled: true,
        domain: SERVICE_URLS[config.appEnv].cookieDomain,
      },
    },
  });
};

export type Auth = ReturnType<typeof createAuth>;
