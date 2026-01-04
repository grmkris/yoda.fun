import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import { type Environment, SERVICE_URLS } from "@yoda.fun/shared/services";
import { UserId } from "@yoda.fun/shared/typeid";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, customSession } from "better-auth/plugins";
import { siwx } from "./plugins/siwx";

export interface AuthConfig {
  db: Database;
  appEnv: Environment;
  secret: string;
  signupBonusEnabled?: boolean;
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
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      anonymous({
        generateName: () => {
          const prefixes = [
            "Wise",
            "Young",
            "Swift",
            "Brave",
            "Hidden",
            "Silent",
            "Rising",
          ];
          const titles = [
            "Padawan",
            "Jedi",
            "Force User",
            "Seeker",
            "Guardian",
            "Apprentice",
          ];
          const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
          const title = titles[Math.floor(Math.random() * titles.length)];
          const num = Math.floor(Math.random() * 1000);
          return `${prefix} ${title} #${num}`;
        },
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          const oldUserId = UserId.parse(anonymousUser.user.id);
          const newUserId = UserId.parse(newUser.user.id);

          // Migrate all user data from anonymous to new user
          await Promise.all([
            // Financial
            config.db
              .update(DB_SCHEMA.userBalance)
              .set({ userId: newUserId })
              .where(eq(DB_SCHEMA.userBalance.userId, oldUserId)),
            config.db
              .update(DB_SCHEMA.transaction)
              .set({ userId: newUserId })
              .where(eq(DB_SCHEMA.transaction.userId, oldUserId)),
            config.db
              .update(DB_SCHEMA.deposit)
              .set({ userId: newUserId })
              .where(eq(DB_SCHEMA.deposit.userId, oldUserId)),
            config.db
              .update(DB_SCHEMA.withdrawal)
              .set({ userId: newUserId })
              .where(eq(DB_SCHEMA.withdrawal.userId, oldUserId)),
            config.db
              .update(DB_SCHEMA.bet)
              .set({ userId: newUserId })
              .where(eq(DB_SCHEMA.bet.userId, oldUserId)),

            // Profile/Social
            config.db
              .update(DB_SCHEMA.userProfile)
              .set({ userId: newUserId })
              .where(eq(DB_SCHEMA.userProfile.userId, oldUserId)),
            config.db
              .update(DB_SCHEMA.userStats)
              .set({ userId: newUserId })
              .where(eq(DB_SCHEMA.userStats.userId, oldUserId)),
            config.db
              .update(DB_SCHEMA.follow)
              .set({ followerId: newUserId })
              .where(eq(DB_SCHEMA.follow.followerId, oldUserId)),
            config.db
              .update(DB_SCHEMA.follow)
              .set({ followingId: newUserId })
              .where(eq(DB_SCHEMA.follow.followingId, oldUserId)),

            // Rewards
            config.db
              .update(DB_SCHEMA.userRewardState)
              .set({ userId: newUserId })
              .where(eq(DB_SCHEMA.userRewardState.userId, oldUserId)),
            config.db
              .update(DB_SCHEMA.rewardClaim)
              .set({ userId: newUserId })
              .where(eq(DB_SCHEMA.rewardClaim.userId, oldUserId)),
            config.db
              .update(DB_SCHEMA.referral)
              .set({ referrerId: newUserId })
              .where(eq(DB_SCHEMA.referral.referrerId, oldUserId)),
            config.db
              .update(DB_SCHEMA.referral)
              .set({ refereeId: newUserId })
              .where(eq(DB_SCHEMA.referral.refereeId, oldUserId)),

            // Media
            config.db
              .update(DB_SCHEMA.media)
              .set({ userId: newUserId })
              .where(eq(DB_SCHEMA.media.userId, oldUserId)),
          ]);
        },
      }),
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
        };
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (config.signupBonusEnabled) {
              await config.db.insert(DB_SCHEMA.userBalance).values({
                userId: UserId.parse(user.id),
                points: 1000,
                totalPointsPurchased: 0,
              });

              await config.db.insert(DB_SCHEMA.transaction).values({
                userId: UserId.parse(user.id),
                type: "SIGNUP_BONUS",
                points: 1000,
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
