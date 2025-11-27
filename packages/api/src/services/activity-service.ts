import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, eq, inArray, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { MarketId, UserId } from "@yoda.fun/shared/typeid";
import type { FollowService } from "./follow-service";

type ActivityType =
  | "BET_PLACED"
  | "BET_WON"
  | "BET_LOST"
  | "STREAK_MILESTONE"
  | "LEADERBOARD_RANK"
  | "FOLLOWED_USER"
  | "PROFILE_UPDATED";

type ActivityMetadata = {
  marketId?: MarketId;
  marketTitle?: string;
  amount?: string;
  payout?: string;
  vote?: "YES" | "NO";
  result?: "WON" | "LOST";
  streakCount?: number;
  rank?: number;
  period?: "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME";
  followedUserId?: UserId;
  followedUsername?: string;
};

type ActivityServiceDeps = {
  db: Database;
  logger: Logger;
  followService: FollowService;
};

export function createActivityService({ deps }: { deps: ActivityServiceDeps }) {
  const { db, logger, followService } = deps;

  return {
    /**
     * Create an activity entry
     */
    async createActivity(options: {
      userId: UserId;
      type: ActivityType;
      metadata?: ActivityMetadata;
      isPublic?: boolean;
    }) {
      const { userId, type, metadata, isPublic = true } = options;

      const created = await db
        .insert(DB_SCHEMA.activity)
        .values({
          userId,
          type,
          metadata,
          isPublic,
        })
        .returning();

      logger.debug({ userId, type }, "Created activity entry");

      return created[0];
    },

    /**
     * Log bet placed activity
     */
    logBetPlaced(options: {
      userId: UserId;
      marketId: MarketId;
      marketTitle: string;
      amount: number;
      vote: "YES" | "NO";
    }) {
      return this.createActivity({
        userId: options.userId,
        type: "BET_PLACED",
        metadata: {
          marketId: options.marketId,
          marketTitle: options.marketTitle,
          amount: options.amount.toFixed(2),
          vote: options.vote,
        },
      });
    },

    /**
     * Log bet result activity
     */
    logBetResult(options: {
      userId: UserId;
      marketId: MarketId;
      marketTitle: string;
      won: boolean;
      payout: number;
    }) {
      return this.createActivity({
        userId: options.userId,
        type: options.won ? "BET_WON" : "BET_LOST",
        metadata: {
          marketId: options.marketId,
          marketTitle: options.marketTitle,
          payout: options.payout.toFixed(2),
          result: options.won ? "WON" : "LOST",
        },
      });
    },

    /**
     * Log streak milestone activity
     */
    logStreakMilestone(options: { userId: UserId; streakCount: number }) {
      // Only log milestones at 5, 10, 25, 50, 100, etc.
      const milestones = [5, 10, 25, 50, 100, 250, 500, 1000];
      if (!milestones.includes(options.streakCount)) {
        return null;
      }

      return this.createActivity({
        userId: options.userId,
        type: "STREAK_MILESTONE",
        metadata: {
          streakCount: options.streakCount,
        },
      });
    },

    /**
     * Log followed user activity
     */
    logFollowedUser(options: {
      userId: UserId;
      followedUserId: UserId;
      followedUsername: string;
    }) {
      return this.createActivity({
        userId: options.userId,
        type: "FOLLOWED_USER",
        metadata: {
          followedUserId: options.followedUserId,
          followedUsername: options.followedUsername,
        },
      });
    },

    /**
     * Get global activity feed (public activities from all users)
     */
    async getGlobalFeed(options: { limit?: number; offset?: number }) {
      const { limit = 50, offset = 0 } = options;

      const activities = await db
        .select({
          activity: DB_SCHEMA.activity,
          user: {
            id: DB_SCHEMA.user.id,
            name: DB_SCHEMA.user.name,
            username: DB_SCHEMA.user.username,
            displayUsername: DB_SCHEMA.user.displayUsername,
            image: DB_SCHEMA.user.image,
          },
        })
        .from(DB_SCHEMA.activity)
        .innerJoin(
          DB_SCHEMA.user,
          eq(DB_SCHEMA.activity.userId, DB_SCHEMA.user.id)
        )
        .leftJoin(
          DB_SCHEMA.userProfile,
          eq(DB_SCHEMA.activity.userId, DB_SCHEMA.userProfile.userId)
        )
        .where(
          and(
            eq(DB_SCHEMA.activity.isPublic, true),
            sql`(${DB_SCHEMA.userProfile.isPublic} IS NULL OR ${DB_SCHEMA.userProfile.isPublic} = true)`
          )
        )
        .orderBy(sql`${DB_SCHEMA.activity.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return activities.map((a) => ({
        id: a.activity.id,
        type: a.activity.type,
        metadata: a.activity.metadata,
        createdAt: a.activity.createdAt,
        user: a.user,
      }));
    },

    /**
     * Get activity feed from users you follow
     */
    async getFollowingFeed(options: {
      userId: UserId;
      limit?: number;
      offset?: number;
    }) {
      const { userId, limit = 50, offset = 0 } = options;

      // Get IDs of users being followed
      const followingIds = await followService.getFollowingIds(userId);

      if (followingIds.length === 0) {
        return [];
      }

      const activities = await db
        .select({
          activity: DB_SCHEMA.activity,
          user: {
            id: DB_SCHEMA.user.id,
            name: DB_SCHEMA.user.name,
            username: DB_SCHEMA.user.username,
            displayUsername: DB_SCHEMA.user.displayUsername,
            image: DB_SCHEMA.user.image,
          },
        })
        .from(DB_SCHEMA.activity)
        .innerJoin(
          DB_SCHEMA.user,
          eq(DB_SCHEMA.activity.userId, DB_SCHEMA.user.id)
        )
        .where(
          and(
            inArray(DB_SCHEMA.activity.userId, followingIds),
            eq(DB_SCHEMA.activity.isPublic, true)
          )
        )
        .orderBy(sql`${DB_SCHEMA.activity.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return activities.map((a) => ({
        id: a.activity.id,
        type: a.activity.type,
        metadata: a.activity.metadata,
        createdAt: a.activity.createdAt,
        user: a.user,
      }));
    },

    /**
     * Get a user's activity
     */
    async getUserActivity(options: {
      userId: UserId;
      viewerId?: UserId;
      limit?: number;
      offset?: number;
    }) {
      const { userId, viewerId, limit = 50, offset = 0 } = options;

      const isOwner = viewerId === userId;

      // Check profile visibility
      const profile = await db
        .select({ isPublic: DB_SCHEMA.userProfile.isPublic })
        .from(DB_SCHEMA.userProfile)
        .where(eq(DB_SCHEMA.userProfile.userId, userId))
        .limit(1);

      const profileIsPublic = profile[0]?.isPublic ?? true;

      if (!(isOwner || profileIsPublic)) {
        return { visible: false, activities: [] };
      }

      const whereClause = isOwner
        ? eq(DB_SCHEMA.activity.userId, userId)
        : and(
            eq(DB_SCHEMA.activity.userId, userId),
            eq(DB_SCHEMA.activity.isPublic, true)
          );

      const activities = await db
        .select()
        .from(DB_SCHEMA.activity)
        .where(whereClause)
        .orderBy(sql`${DB_SCHEMA.activity.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return {
        visible: true,
        activities: activities.map((a) => ({
          id: a.id,
          type: a.type,
          metadata: a.metadata,
          createdAt: a.createdAt,
          isPublic: a.isPublic,
        })),
      };
    },
  };
}

export type ActivityService = ReturnType<typeof createActivityService>;
