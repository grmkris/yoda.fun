import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { type Environment, SERVICE_URLS } from "@yoda.fun/shared/services";
import { UserId } from "@yoda.fun/shared/typeid";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, siwe } from "better-auth/plugins";
import { Porto, RelayActions } from "porto";
import { RelayClient } from "porto/viem";
import { hashMessage } from "viem";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";

export interface AuthConfig {
  db: Database;
  appEnv: Environment;
  secret: string;
  signupBonusEnabled?: boolean;
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
      anonymous(),
      siwe({
        domain: SERVICE_URLS[config.appEnv].siweDomain,
        getNonce: async () => generateSiweNonce(),
        verifyMessage: async ({ message, signature }) => {
          try {
            const { address, chainId } = parseSiweMessage(message);
            if (!(address && chainId)) {
              return false;
            }
            const client = RelayClient.fromPorto(porto, { chainId });
            const result = await RelayActions.verifySignature(client, {
              address,
              digest: hashMessage(message),
              signature: signature as `0x${string}`,
            });
            return result.valid;
          } catch {
            return false;
          }
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (config.signupBonusEnabled) {
              await config.db.insert(DB_SCHEMA.userBalance).values({
                userId: UserId.parse(user.id),
                availableBalance: "10.00",
                totalDeposited: "10.00",
              });

              await config.db.insert(DB_SCHEMA.transaction).values({
                userId: UserId.parse(user.id),
                type: "DEPOSIT",
                amount: "10.00",
                status: "COMPLETED",
                metadata: { reason: "signup_bonus" },
              });
            }
          },
        },
      },
    },
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
