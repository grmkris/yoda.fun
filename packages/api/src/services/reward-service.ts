import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq, sql } from "@yoda.fun/db/drizzle";
import type { UserId } from "@yoda.fun/shared/typeid";
import { nanoid } from "nanoid";

interface RewardServiceDeps {
  db: Database;
}

export function createRewardService({ deps }: { deps: RewardServiceDeps }) {
  const { db } = deps;

  return {
    async getOrCreateRewardState(userId: UserId) {
      const existing = await db
        .select()
        .from(DB_SCHEMA.userRewardState)
        .where(eq(DB_SCHEMA.userRewardState.userId, userId))
        .limit(1);

      if (existing[0]) {
        return existing[0];
      }

      const referralCode = nanoid(8).toUpperCase();

      const created = await db
        .insert(DB_SCHEMA.userRewardState)
        .values({ userId, referralCode })
        .returning();

      const result = created[0];
      if (!result) {
        throw new Error("Failed to create reward state");
      }
      return result;
    },

    async getReferralCode(userId: UserId) {
      const state = await this.getOrCreateRewardState(userId);
      return state.referralCode;
    },

    async applyReferralCode(refereeUserId: UserId, code: string) {
      const referrer = await db
        .select()
        .from(DB_SCHEMA.userRewardState)
        .where(eq(DB_SCHEMA.userRewardState.referralCode, code.toUpperCase()))
        .limit(1);

      if (!referrer[0]) {
        throw new Error("Invalid referral code");
      }

      if (referrer[0].userId === refereeUserId) {
        throw new Error("Cannot use your own referral code");
      }

      const existingReferral = await db
        .select()
        .from(DB_SCHEMA.referral)
        .where(eq(DB_SCHEMA.referral.refereeId, refereeUserId))
        .limit(1);

      if (existingReferral[0]) {
        throw new Error("Already referred by another user");
      }

      await db.insert(DB_SCHEMA.referral).values({
        referrerId: referrer[0].userId,
        refereeId: refereeUserId,
      });

      return { referrerId: referrer[0].userId };
    },

    async getRewardSummary(userId: UserId) {
      const state = await this.getOrCreateRewardState(userId);

      const claimableRewards = await db
        .select()
        .from(DB_SCHEMA.rewardClaim)
        .where(
          and(
            eq(DB_SCHEMA.rewardClaim.userId, userId),
            eq(DB_SCHEMA.rewardClaim.status, "PENDING")
          )
        );

      const claimableTotal = claimableRewards.reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );

      return {
        claimableCount: claimableRewards.length,
        claimableTotal,
        referral: {
          code: state.referralCode,
          count: state.referralCount,
        },
      };
    },

    async getClaimableCount(userId: UserId) {
      const pendingRewards = await db
        .select({ count: sql<number>`count(*)` })
        .from(DB_SCHEMA.rewardClaim)
        .where(
          and(
            eq(DB_SCHEMA.rewardClaim.userId, userId),
            eq(DB_SCHEMA.rewardClaim.status, "PENDING")
          )
        );

      return Number(pendingRewards[0]?.count ?? 0);
    },

    async getRewardHistory(
      userId: UserId,
      options: { limit: number; offset: number }
    ) {
      const rewards = await db
        .select()
        .from(DB_SCHEMA.rewardClaim)
        .where(eq(DB_SCHEMA.rewardClaim.userId, userId))
        .orderBy(desc(DB_SCHEMA.rewardClaim.createdAt))
        .limit(options.limit)
        .offset(options.offset);

      return rewards;
    },
  };
}

export type RewardService = ReturnType<typeof createRewardService>;
