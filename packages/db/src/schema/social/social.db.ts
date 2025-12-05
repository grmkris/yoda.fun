import {
  type FollowId,
  typeIdGenerator,
  type UserId,
  type UserProfileId,
  type UserStatsId,
} from "@yoda.fun/shared/typeid";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  unique,
} from "drizzle-orm/pg-core";
import {
  baseEntityFields,
  createTimestampField,
  typeId,
} from "../../utils/db-utils";
import { user } from "../auth/auth.db";

// Enums
export const leaderboardPeriodEnum = pgEnum("leaderboard_period", [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "ALL_TIME",
]);

// Tables

/**
 * User statistics for leaderboards and profile display
 * Updated on every bet settlement
 */
export const userStats = pgTable(
  "user_stats",
  {
    id: typeId("userStats", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("userStats"))
      .$type<UserStatsId>(),
    userId: typeId("user", "user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),

    // Lifetime stats
    totalBets: integer("total_bets").notNull().default(0),
    totalWins: integer("total_wins").notNull().default(0),
    totalLosses: integer("total_losses").notNull().default(0),
    totalProfit: numeric("total_profit", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    winRate: numeric("win_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),

    // Streak tracking
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastStreakType: text("last_streak_type").$type<"WIN" | "LOSS">(),

    // Period-based stats (reset periodically via cron)
    dailyProfit: numeric("daily_profit", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    dailyWins: integer("daily_wins").notNull().default(0),
    weeklyProfit: numeric("weekly_profit", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    weeklyWins: integer("weekly_wins").notNull().default(0),
    monthlyProfit: numeric("monthly_profit", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    monthlyWins: integer("monthly_wins").notNull().default(0),

    // Timestamps
    lastBetAt: createTimestampField("last_bet_at"),
    lastWinAt: createTimestampField("last_win_at"),
    ...baseEntityFields,
  },
  (table) => [
    // Indexes for leaderboard queries
    index("idx_user_stats_total_profit").on(table.totalProfit),
    index("idx_user_stats_win_rate").on(table.winRate),
    index("idx_user_stats_current_streak").on(table.currentStreak),
    index("idx_user_stats_daily_profit").on(table.dailyProfit),
    index("idx_user_stats_weekly_profit").on(table.weeklyProfit),
    index("idx_user_stats_monthly_profit").on(table.monthlyProfit),
  ]
);

/**
 * Public user profile information
 */
export const userProfile = pgTable("user_profile", {
  id: typeId("userProfile", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("userProfile"))
    .$type<UserProfileId>(),
  userId: typeId("user", "user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" })
    .$type<UserId>(),

  // Profile info
  bio: text("bio"),
  avatarUrl: text("avatar_url"),

  // Visibility settings
  isPublic: boolean("is_public").notNull().default(true),
  showStats: boolean("show_stats").notNull().default(true),
  showBetHistory: boolean("show_bet_history").notNull().default(true),

  // Social links
  twitterHandle: text("twitter_handle"),
  telegramHandle: text("telegram_handle"),

  // Follower counts (denormalized for performance)
  followerCount: integer("follower_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),

  ...baseEntityFields,
});

/**
 * Follow relationships between users
 */
export const follow = pgTable(
  "follow",
  {
    id: typeId("follow", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("follow"))
      .$type<FollowId>(),
    followerId: typeId("user", "follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    followingId: typeId("user", "following_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    ...baseEntityFields,
  },
  (table) => [
    // Each user can only follow another user once
    unique("unique_follow_relationship").on(
      table.followerId,
      table.followingId
    ),
    // Indexes for efficient queries
    index("idx_follow_follower").on(table.followerId),
    index("idx_follow_following").on(table.followingId),
  ]
);
