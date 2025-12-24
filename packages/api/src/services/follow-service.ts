import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { UserId } from "@yoda.fun/shared/typeid";
import type { ProfileService } from "./profile-service";

interface FollowServiceDeps {
  db: Database;
  logger: Logger;
  profileService: ProfileService;
}

export function createFollowService({ deps }: { deps: FollowServiceDeps }) {
  const { db, logger, profileService } = deps;

  return {
    /**
     * Check if a user is following another user
     */
    async isFollowing(followerId: UserId, followingId: UserId) {
      const result = await db
        .select({ id: DB_SCHEMA.follow.id })
        .from(DB_SCHEMA.follow)
        .where(
          and(
            eq(DB_SCHEMA.follow.followerId, followerId),
            eq(DB_SCHEMA.follow.followingId, followingId)
          )
        )
        .limit(1);

      return result.length > 0;
    },

    /**
     * Follow a user
     */
    async follow(followerId: UserId, followingId: UserId) {
      // Can't follow yourself
      if (followerId === followingId) {
        throw new Error("Cannot follow yourself");
      }

      // Check if already following
      const existing = await this.isFollowing(followerId, followingId);
      if (existing) {
        return { alreadyFollowing: true };
      }

      // Create follow relationship
      await db.insert(DB_SCHEMA.follow).values({
        followerId,
        followingId,
      });

      // Update counts (ensure profiles exist first)
      await profileService.getOrCreateProfile(followerId);
      await profileService.getOrCreateProfile(followingId);
      await profileService.updateFollowingCount(followerId, 1);
      await profileService.updateFollowerCount(followingId, 1);

      logger.info({ followerId, followingId }, "User followed");

      return { alreadyFollowing: false };
    },

    /**
     * Unfollow a user
     */
    async unfollow(followerId: UserId, followingId: UserId) {
      const result = await db
        .delete(DB_SCHEMA.follow)
        .where(
          and(
            eq(DB_SCHEMA.follow.followerId, followerId),
            eq(DB_SCHEMA.follow.followingId, followingId)
          )
        )
        .returning();

      if (result.length > 0) {
        // Update counts
        await profileService.updateFollowingCount(followerId, -1);
        await profileService.updateFollowerCount(followingId, -1);

        logger.info({ followerId, followingId }, "User unfollowed");
        return { wasFollowing: true };
      }

      return { wasFollowing: false };
    },

    /**
     * Toggle follow status
     */
    async toggleFollow(followerId: UserId, followingId: UserId) {
      const isFollowing = await this.isFollowing(followerId, followingId);

      if (isFollowing) {
        await this.unfollow(followerId, followingId);
        return { isFollowing: false };
      }

      await this.follow(followerId, followingId);
      return { isFollowing: true };
    },

    /**
     * Get a user's followers
     */
    async getFollowers(options: {
      userId: UserId;
      limit?: number;
      offset?: number;
    }) {
      const { userId, limit = 50, offset = 0 } = options;

      const followers = await db
        .select({
          followId: DB_SCHEMA.follow.id,
          createdAt: DB_SCHEMA.follow.createdAt,
          user: {
            id: DB_SCHEMA.user.id,
            name: DB_SCHEMA.user.name,
            username: DB_SCHEMA.user.username,
            displayUsername: DB_SCHEMA.user.displayUsername,
            image: DB_SCHEMA.user.image,
          },
        })
        .from(DB_SCHEMA.follow)
        .innerJoin(
          DB_SCHEMA.user,
          eq(DB_SCHEMA.follow.followerId, DB_SCHEMA.user.id)
        )
        .where(eq(DB_SCHEMA.follow.followingId, userId))
        .orderBy(sql`${DB_SCHEMA.follow.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return followers.map((f) => ({
        ...f.user,
        followedAt: f.createdAt,
      }));
    },

    /**
     * Get users that a user is following
     */
    async getFollowing(options: {
      userId: UserId;
      limit?: number;
      offset?: number;
    }) {
      const { userId, limit = 50, offset = 0 } = options;

      const following = await db
        .select({
          followId: DB_SCHEMA.follow.id,
          createdAt: DB_SCHEMA.follow.createdAt,
          user: {
            id: DB_SCHEMA.user.id,
            name: DB_SCHEMA.user.name,
            username: DB_SCHEMA.user.username,
            displayUsername: DB_SCHEMA.user.displayUsername,
            image: DB_SCHEMA.user.image,
          },
        })
        .from(DB_SCHEMA.follow)
        .innerJoin(
          DB_SCHEMA.user,
          eq(DB_SCHEMA.follow.followingId, DB_SCHEMA.user.id)
        )
        .where(eq(DB_SCHEMA.follow.followerId, userId))
        .orderBy(sql`${DB_SCHEMA.follow.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return following.map((f) => ({
        ...f.user,
        followedAt: f.createdAt,
      }));
    },

    /**
     * Get follower/following IDs for a user (for activity feed filtering)
     */
    async getFollowingIds(userId: UserId) {
      const following = await db
        .select({ followingId: DB_SCHEMA.follow.followingId })
        .from(DB_SCHEMA.follow)
        .where(eq(DB_SCHEMA.follow.followerId, userId));

      return following.map((f) => f.followingId);
    },

    /**
     * Get follow counts for a user
     */
    async getFollowCounts(userId: UserId) {
      const profile = await db
        .select({
          followerCount: DB_SCHEMA.userProfile.followerCount,
          followingCount: DB_SCHEMA.userProfile.followingCount,
        })
        .from(DB_SCHEMA.userProfile)
        .where(eq(DB_SCHEMA.userProfile.userId, userId))
        .limit(1);

      return profile[0] ?? { followerCount: 0, followingCount: 0 };
    },
  };
}

export type FollowService = ReturnType<typeof createFollowService>;
