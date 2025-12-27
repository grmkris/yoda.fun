import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq, sql } from "@yoda.fun/db/drizzle";
import type { BetId, UserId } from "@yoda.fun/shared/typeid";
import { nanoid } from "nanoid";
import type { BalanceService } from "./balance-service";

const DAILY_STREAK_AMOUNTS = [1, 2, 3, 4, 5, 6, 7] as const;
const WIN_STREAK_MILESTONES = { 3: 2, 5: 5, 10: 15 } as const;
const VOLUME_MILESTONES = { 100: 5, 500: 15, 1000: 50 } as const;
const FIRST_BET_BONUS = 5;
const REFERRAL_BONUS = 5;
const DAILY_CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const STREAK_BREAK_MS = 48 * 60 * 60 * 1000; // 48 hours (24h window after 24h cooldown)

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

function getVolumeUpdates(milestones: number[]) {
  const updates: Record<string, boolean> = {};
  for (const m of milestones) {
    if (m === 100) {
      updates.volume100Claimed = true;
    }
    if (m === 500) {
      updates.volume500Claimed = true;
    }
    if (m === 1000) {
      updates.volume1000Claimed = true;
    }
  }
  return updates;
}

interface RewardServiceDeps {
  db: Database;
  balanceService: BalanceService;
}

export function createRewardService({ deps }: { deps: RewardServiceDeps }) {
  const { db, balanceService } = deps;

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

    async canClaimDailyStreak(userId: UserId) {
      const state = await this.getOrCreateRewardState(userId);
      const now = new Date();
      const lastClaim = state.lastDailyClaimAt;

      if (!lastClaim) {
        return {
          canClaim: true,
          currentStreak: 0,
          nextClaimAt: null,
          streakBroken: false,
          amount: DAILY_STREAK_AMOUNTS[0],
        };
      }

      const timeSinceLastClaim = now.getTime() - lastClaim.getTime();

      if (timeSinceLastClaim < DAILY_CLAIM_COOLDOWN_MS) {
        const nextClaimAt = new Date(
          lastClaim.getTime() + DAILY_CLAIM_COOLDOWN_MS
        );
        return {
          canClaim: false,
          currentStreak: state.currentDailyStreak,
          nextClaimAt,
          streakBroken: false,
          amount: DAILY_STREAK_AMOUNTS[Math.min(state.currentDailyStreak, 6)],
        };
      }

      const streakBroken = timeSinceLastClaim > STREAK_BREAK_MS;
      const nextStreakDay = streakBroken ? 0 : state.currentDailyStreak;

      return {
        canClaim: true,
        currentStreak: nextStreakDay,
        nextClaimAt: null,
        streakBroken,
        amount: DAILY_STREAK_AMOUNTS[Math.min(nextStreakDay, 6)],
      };
    },

    async claimDailyStreak(userId: UserId) {
      const check = await this.canClaimDailyStreak(userId);

      if (!check.canClaim) {
        throw new Error(
          `Cannot claim yet. Next claim at ${check.nextClaimAt?.toISOString()}`
        );
      }

      const now = new Date();
      const newStreak = check.streakBroken ? 1 : check.currentStreak + 1;
      const amount = DAILY_STREAK_AMOUNTS[Math.min(newStreak - 1, 6)] ?? 1;

      const result = await db.transaction(async (tx) => {
        await tx
          .update(DB_SCHEMA.userRewardState)
          .set({
            currentDailyStreak: newStreak > 7 ? 1 : newStreak, // Reset after day 7
            lastDailyClaimAt: now,
          })
          .where(eq(DB_SCHEMA.userRewardState.userId, userId));

        const [claim] = await tx
          .insert(DB_SCHEMA.rewardClaim)
          .values({
            userId,
            rewardType: "DAILY_STREAK",
            amount: amount.toFixed(2),
            status: "CLAIMED",
            claimedAt: now,
            metadata: { streakDay: newStreak > 7 ? 1 : newStreak },
          })
          .returning();

        if (!claim) {
          throw new Error("Failed to create reward claim");
        }

        return claim;
      });

      await balanceService.creditBalance(userId, amount, "REWARD", {
        rewardType: "DAILY_STREAK",
        rewardClaimId: result.id,
        streakDay: newStreak > 7 ? 1 : newStreak,
      });

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
          amount: FIRST_BET_BONUS.toFixed(2),
          status: "AUTO_CREDITED",
          claimedAt: new Date(),
          metadata: { betId },
        });
      });

      await balanceService.creditBalance(userId, FIRST_BET_BONUS, "REWARD", {
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
            amount: r.amount.toFixed(2),
            status: "AUTO_CREDITED",
            claimedAt: new Date(),
            metadata: { winStreakCount: r.milestone },
          });
        }
      });

      const totalAmount = rewards.reduce((sum, r) => sum + r.amount, 0);
      await balanceService.creditBalance(userId, totalAmount, "REWARD", {
        rewardType: "WIN_STREAK",
        milestones: rewards.map((r) => r.milestone),
      });

      return rewards;
    },

    async processVolumeMilestone(userId: UserId, betAmount: number) {
      const state = await this.getOrCreateRewardState(userId);
      const currentVolume = Number(state.totalBettingVolume);
      const newVolume = currentVolume + betAmount;
      const rewards: { milestone: number; amount: number }[] = [];

      if (newVolume >= 100 && !state.volume100Claimed) {
        rewards.push({ milestone: 100, amount: VOLUME_MILESTONES[100] });
      }
      if (newVolume >= 500 && !state.volume500Claimed) {
        rewards.push({ milestone: 500, amount: VOLUME_MILESTONES[500] });
      }
      if (newVolume >= 1000 && !state.volume1000Claimed) {
        rewards.push({ milestone: 1000, amount: VOLUME_MILESTONES[1000] });
      }

      const milestoneUpdates = getVolumeUpdates(
        rewards.map((r) => r.milestone)
      );
      const updates: Record<string, unknown> = {
        ...milestoneUpdates,
        totalBettingVolume: sql`${DB_SCHEMA.userRewardState.totalBettingVolume} + ${betAmount.toFixed(2)}`,
      };

      await db.transaction(async (tx) => {
        await tx
          .update(DB_SCHEMA.userRewardState)
          .set(updates)
          .where(eq(DB_SCHEMA.userRewardState.userId, userId));

        for (const r of rewards) {
          await tx.insert(DB_SCHEMA.rewardClaim).values({
            userId,
            rewardType: "VOLUME_MILESTONE",
            amount: r.amount.toFixed(2),
            status: "AUTO_CREDITED",
            claimedAt: new Date(),
            metadata: { volumeMilestone: r.milestone },
          });
        }
      });

      if (rewards.length > 0) {
        const totalAmount = rewards.reduce((sum, r) => sum + r.amount, 0);
        await balanceService.creditBalance(userId, totalAmount, "REWARD", {
          rewardType: "VOLUME_MILESTONE",
          milestones: rewards.map((r) => r.milestone),
        });
      }

      return rewards.length > 0 ? rewards : null;
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
          amount: REFERRAL_BONUS.toFixed(2),
          status: "AUTO_CREDITED",
          claimedAt: new Date(),
          metadata: { referredUserId: refereeUserId },
        });
      });

      await balanceService.creditBalance(referrerId, REFERRAL_BONUS, "REWARD", {
        rewardType: "REFERRAL_BONUS",
        referredUserId: refereeUserId,
      });

      return { referrerId, amount: REFERRAL_BONUS };
    },

    async getRewardSummary(userId: UserId) {
      const state = await this.getOrCreateRewardState(userId);
      const dailyCheck = await this.canClaimDailyStreak(userId);

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

      const volume = Number(state.totalBettingVolume);
      let nextVolumeMilestone: number | null = null;
      let volumeProgress = 0;

      if (!state.volume1000Claimed) {
        if (!state.volume100Claimed) {
          nextVolumeMilestone = 100;
          volumeProgress = (volume / 100) * 100;
        } else if (state.volume500Claimed) {
          nextVolumeMilestone = 1000;
          volumeProgress = (volume / 1000) * 100;
        } else {
          nextVolumeMilestone = 500;
          volumeProgress = (volume / 500) * 100;
        }
      }

      return {
        claimableCount: claimableRewards.length + (dailyCheck.canClaim ? 1 : 0),
        claimableTotal:
          claimableTotal + (dailyCheck.canClaim ? (dailyCheck.amount ?? 0) : 0),
        dailyStreak: {
          currentDay: state.currentDailyStreak,
          canClaim: dailyCheck.canClaim,
          nextClaimAt: dailyCheck.nextClaimAt,
          streakBroken: dailyCheck.streakBroken,
          nextAmount: dailyCheck.amount,
        },
        firstBetBonus: {
          earned: state.firstBetBonusClaimed,
          amount: FIRST_BET_BONUS,
        },
        winStreak: {
          milestone3: state.winStreak3Claimed,
          milestone5: state.winStreak5Claimed,
          milestone10: state.winStreak10Claimed,
        },
        volume: {
          total: volume,
          nextMilestone: nextVolumeMilestone,
          progress: Math.min(volumeProgress, 100),
          milestone100: state.volume100Claimed,
          milestone500: state.volume500Claimed,
          milestone1000: state.volume1000Claimed,
        },
        referral: {
          code: state.referralCode,
          count: state.referralCount,
          earnings: state.referralCount * REFERRAL_BONUS,
        },
      };
    },

    async getClaimableCount(userId: UserId) {
      const dailyCheck = await this.canClaimDailyStreak(userId);

      const pendingRewards = await db
        .select({ count: sql<number>`count(*)` })
        .from(DB_SCHEMA.rewardClaim)
        .where(
          and(
            eq(DB_SCHEMA.rewardClaim.userId, userId),
            eq(DB_SCHEMA.rewardClaim.status, "PENDING")
          )
        );

      const pendingCount = Number(pendingRewards[0]?.count ?? 0);
      return pendingCount + (dailyCheck.canClaim ? 1 : 0);
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
