import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import { type Environment, SERVICE_URLS } from "@yoda.fun/shared/services";
import { UserId } from "@yoda.fun/shared/typeid";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { siwx } from "./plugins/siwx";

export interface AuthConfig {
  db: Database;
  appEnv: Environment;
  secret: string;
}

export const createAuth = (config: AuthConfig) => {
  const baseURL = SERVICE_URLS[config.appEnv].auth;
  const trustedOrigins = [SERVICE_URLS[config.appEnv].web];

  return betterAuth<BetterAuthOptions>({
    database: drizzleAdapter(config.db, {
      provider: "pg",
      schema: DB_SCHEMA,
    }),
    secret: config.secret,
    baseURL,
    trustedOrigins,
    plugins: [
      siwx({
        cookieDomain: SERVICE_URLS[config.appEnv].cookieDomain,
      }),
      customSession(async ({ user, session }) => {
        const wallet = await config.db.query.walletAddress.findFirst({
          where: eq(
            DB_SCHEMA.walletAddress.userId,
            UserId.parse(session.userId)
          ),
        });
        return {
          user,
          session,
          walletAddress: wallet?.address ?? null,
          chainNamespace: wallet?.chainNamespace ?? null,
          chainId: wallet?.chainId ?? null,
        } as const;
      }),
    ],
    advanced: {
      database: {
        generateId: false,
      },
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
