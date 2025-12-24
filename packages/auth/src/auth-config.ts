import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { type Environment, SERVICE_URLS } from "@yoda.fun/shared/services";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { siwe } from "better-auth/plugins";
import { Porto } from "porto";
import { RelayClient } from "porto/viem";
import { generateSiweNonce, verifySiweMessage } from "viem/siwe";

export interface AuthConfig {
  db: Database;
  appEnv: Environment;
  secret: string;
}

export const createAuth = (config: AuthConfig) => {
  const baseURL = SERVICE_URLS[config.appEnv].auth;
  const trustedOrigins = [SERVICE_URLS[config.appEnv].web];

  // Create Porto instance for SIWE verification
  const porto = Porto.create();

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
    plugins: [
      siwe({
        domain: SERVICE_URLS[config.appEnv].siweDomain,
        anonymous: false,
        getNonce: async () => generateSiweNonce(),
        verifyMessage: async ({ message, signature, chainId }) => {
          try {
            // Use Porto's RelayClient for verification
            const client = RelayClient.fromPorto(porto, { chainId });
            const isValid = await verifySiweMessage(client, {
              message,
              signature: signature as `0x${string}`,
            });
            return isValid;
          } catch {
            return false;
          }
        },
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
