import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq, sql } from "@yoda.fun/db/drizzle";
import type { BetId, UserId } from "@yoda.fun/shared/typeid";
import { nanoid } from "nanoid";
import type { PointsService } from "./points-service";

// Points-based reward amounts
const WIN_STREAK_MILESTONES = { 3: 5, 5: 10, 10: 25 } as const;
const FIRST_BET_BONUS = 10; // points
const REFERRAL_BONUS_REFERRER = 10; // points for referrer
const REFERRAL_BONUS_REFEREE = 10; // bonus points for using referral code

function getWinStreakUpdates(milestones: number[]) {
  const updates: Record<string, boolean> = {};
  for (const m of milestones) {
    if (m === 3) {
      updates.winStreak3Claimed = true;
    }
    if (m === 5) {
      updates.winStreak5Claimed = true;
    }
    if (m === 10) {
      updates.winStreak10Claimed = true;
    }
  }
  return updates;
}

interface RewardServiceDeps {
  db: Database;
  pointsService: PointsService;
}

export function createRewardService({ deps }: { deps: RewardServiceDeps }) {
  const { db, pointsService } = deps;

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

    async processFirstBetBonus(userId: UserId, betId: BetId) {
      const state = await this.getOrCreateRewardState(userId);

      if (state.firstBetBonusClaimed) {
        return null;
      }

      await db.transaction(async (tx) => {
        await tx
          .update(DB_SCHEMA.userRewardState)
          .set({ firstBetBonusClaimed: true })
          .where(eq(DB_SCHEMA.userRewardState.userId, userId));

        await tx.insert(DB_SCHEMA.rewardClaim).values({
          userId,
          rewardType: "FIRST_BET",
          amount: FIRST_BET_BONUS.toString(),
          status: "AUTO_CREDITED",
          claimedAt: new Date(),
          metadata: { betId },
        });
      });

      await pointsService.creditPoints(userId, FIRST_BET_BONUS, "REWARD", {
        rewardType: "FIRST_BET",
        betId,
      });

      return { amount: FIRST_BET_BONUS };
    },

    async processWinStreakBonus(userId: UserId, currentWinStreak: number) {
      const state = await this.getOrCreateRewardState(userId);
      const rewards: { milestone: number; amount: number }[] = [];

      if (currentWinStreak >= 3 && !state.winStreak3Claimed) {
        rewards.push({ milestone: 3, amount: WIN_STREAK_MILESTONES[3] });
      }
      if (currentWinStreak >= 5 && !state.winStreak5Claimed) {
        rewards.push({ milestone: 5, amount: WIN_STREAK_MILESTONES[5] });
      }
      if (currentWinStreak >= 10 && !state.winStreak10Claimed) {
        rewards.push({ milestone: 10, amount: WIN_STREAK_MILESTONES[10] });
      }

      if (rewards.length === 0) {
        return null;
      }

      const updates = getWinStreakUpdates(rewards.map((r) => r.milestone));

      await db.transaction(async (tx) => {
        await tx
          .update(DB_SCHEMA.userRewardState)
          .set(updates)
          .where(eq(DB_SCHEMA.userRewardState.userId, userId));

        for (const r of rewards) {
          await tx.insert(DB_SCHEMA.rewardClaim).values({
            userId,
            rewardType: "WIN_STREAK",
            amount: r.amount.toString(),
            status: "AUTO_CREDITED",
            claimedAt: new Date(),
            metadata: { winStreakCount: r.milestone },
          });
        }
      });

      const totalAmount = rewards.reduce((sum, r) => sum + r.amount, 0);
      await pointsService.creditPoints(userId, totalAmount, "REWARD", {
        rewardType: "WIN_STREAK",
        milestones: rewards.map((r) => r.milestone),
      });

      return rewards;
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

      // Give bonus points to referee for using referral code
      await pointsService.creditPoints(
        refereeUserId,
        REFERRAL_BONUS_REFEREE,
        "REWARD",
        {
          rewardType: "REFERRAL_SIGNUP",
          referrerId: referrer[0].userId,
        }
      );

      return { referrerId: referrer[0].userId };
    },

    async processReferralBonus(refereeUserId: UserId) {
      const [referralRecord] = await db
        .select()
        .from(DB_SCHEMA.referral)
        .where(
          and(
            eq(DB_SCHEMA.referral.refereeId, refereeUserId),
            eq(DB_SCHEMA.referral.referrerRewarded, false)
          )
        )
        .limit(1);

      if (!referralRecord) {
        return null;
      }

      const referrerId = referralRecord.referrerId;

      await db.transaction(async (tx) => {
        await tx
          .update(DB_SCHEMA.referral)
          .set({ referrerRewarded: true, rewardedAt: new Date() })
          .where(eq(DB_SCHEMA.referral.id, referralRecord.id));

        await tx
          .update(DB_SCHEMA.userRewardState)
          .set({
            referralCount: sql`${DB_SCHEMA.userRewardState.referralCount} + 1`,
          })
          .where(eq(DB_SCHEMA.userRewardState.userId, referrerId));

        await tx.insert(DB_SCHEMA.rewardClaim).values({
          userId: referrerId,
          rewardType: "REFERRAL_BONUS",
          amount: REFERRAL_BONUS_REFERRER.toString(),
          status: "AUTO_CREDITED",
          claimedAt: new Date(),
          metadata: { referredUserId: refereeUserId },
        });
      });

      await pointsService.creditPoints(
        referrerId,
        REFERRAL_BONUS_REFERRER,
        "REWARD",
        {
          rewardType: "REFERRAL_BONUS",
          referredUserId: refereeUserId,
        }
      );

      return { referrerId, amount: REFERRAL_BONUS_REFERRER };
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
        firstBetBonus: {
          earned: state.firstBetBonusClaimed,
          amount: FIRST_BET_BONUS,
        },
        winStreak: {
          milestone3: state.winStreak3Claimed,
          milestone5: state.winStreak5Claimed,
          milestone10: state.winStreak10Claimed,
          amounts: WIN_STREAK_MILESTONES,
        },
        referral: {
          code: state.referralCode,
          count: state.referralCount,
          earnings: state.referralCount * REFERRAL_BONUS_REFERRER,
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
