import {
  type ReferralId,
  type RewardClaimId,
  type RewardId,
  type TransactionId,
  typeIdGenerator,
  type UserId,
} from "@yoda.fun/shared/typeid";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import {
  baseEntityFields,
  createTimestampField,
  typeId,
} from "../../utils/db-utils";
import { user } from "../auth/auth.db";
import { transaction } from "../market/transaction.db";

// Enums
export const rewardTypeEnum = pgEnum("reward_type", [
  "DAILY_STREAK",
  "FIRST_BET",
  "WIN_STREAK",
  "REFERRAL_BONUS",
  "VOLUME_MILESTONE",
]);

export const rewardStatusEnum = pgEnum("reward_status", [
  "PENDING",
  "CLAIMED",
  "AUTO_CREDITED",
  "EXPIRED",
]);

export const userRewardState = pgTable("user_reward_state", {
  id: typeId("reward", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("reward"))
    .$type<RewardId>(),
  userId: typeId("user", "user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" })
    .$type<UserId>(),

  currentDailyStreak: integer("current_daily_streak").notNull().default(0),
  lastDailyClaimAt: createTimestampField("last_daily_claim_at"),

  firstBetBonusClaimed: boolean("first_bet_bonus_claimed")
    .notNull()
    .default(false),

  winStreak3Claimed: boolean("win_streak_3_claimed").notNull().default(false),
  winStreak5Claimed: boolean("win_streak_5_claimed").notNull().default(false),
  winStreak10Claimed: boolean("win_streak_10_claimed").notNull().default(false),

  totalBettingVolume: numeric("total_betting_volume", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("0.00"),
  volume100Claimed: boolean("volume_100_claimed").notNull().default(false),
  volume500Claimed: boolean("volume_500_claimed").notNull().default(false),
  volume1000Claimed: boolean("volume_1000_claimed").notNull().default(false),

  referralCode: text("referral_code").unique(),
  referralCount: integer("referral_count").notNull().default(0),

  ...baseEntityFields,
});

export const rewardClaim = pgTable(
  "reward_claim",
  {
    id: typeId("rewardClaim", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("rewardClaim"))
      .$type<RewardClaimId>(),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    rewardType: rewardTypeEnum("reward_type").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    status: rewardStatusEnum("status").notNull().default("PENDING"),

    metadata: jsonb("metadata").$type<{
      streakDay?: number;
      winStreakCount?: number;
      referredUserId?: string;
      volumeMilestone?: number;
      betId?: string;
    }>(),

    claimedAt: createTimestampField("claimed_at"),
    expiresAt: createTimestampField("expires_at"),
    transactionId: typeId("transaction", "transaction_id")
      .references(() => transaction.id, { onDelete: "set null" })
      .$type<TransactionId>(),
    ...baseEntityFields,
  },
  (table) => [
    index("idx_reward_claim_user").on(table.userId),
    index("idx_reward_claim_status").on(table.status),
    index("idx_reward_claim_type").on(table.rewardType),
  ]
);

export const referral = pgTable(
  "referral",
  {
    id: typeId("referral", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("referral"))
      .$type<ReferralId>(),
    referrerId: typeId("user", "referrer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    refereeId: typeId("user", "referee_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),

    referrerRewarded: boolean("referrer_rewarded").notNull().default(false),
    rewardedAt: createTimestampField("rewarded_at"),

    ...baseEntityFields,
  },
  (table) => [index("idx_referral_referrer").on(table.referrerId)]
);
