import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { UserId } from "@yoda.fun/shared/typeid";

const LEADING_AT_REGEX = /^@/;

interface ProfileServiceDeps {
  db: Database;
  logger: Logger;
}

export function createProfileService({ deps }: { deps: ProfileServiceDeps }) {
  const { db, logger } = deps;

  return {
    /**
     * Get or create a user's profile
     */
    async getOrCreateProfile(userId: UserId) {
      const existing = await db
        .select()
        .from(DB_SCHEMA.userProfile)
        .where(eq(DB_SCHEMA.userProfile.userId, userId))
        .limit(1);

      if (existing[0]) {
        return existing[0];
      }

      const [created] = await db
        .insert(DB_SCHEMA.userProfile)
        .values({ userId })
        .returning();

      if (!created) {
        throw new Error("Failed to create user profile");
      }
      logger.info({ userId }, "Created new user profile");
      return created;
    },

    /**
     * Get a user's public profile by userId
     */
    async getProfileByUserId(userId: UserId, viewerId?: UserId) {
      const result = await db
        .select({
          profile: DB_SCHEMA.userProfile,
          user: {
            id: DB_SCHEMA.user.id,
            name: DB_SCHEMA.user.name,
            username: DB_SCHEMA.user.username,
            displayUsername: DB_SCHEMA.user.displayUsername,
            image: DB_SCHEMA.user.image,
          },
          stats: DB_SCHEMA.userStats,
        })
        .from(DB_SCHEMA.user)
        .leftJoin(
          DB_SCHEMA.userProfile,
          eq(DB_SCHEMA.user.id, DB_SCHEMA.userProfile.userId)
        )
        .leftJoin(
          DB_SCHEMA.userStats,
          eq(DB_SCHEMA.user.id, DB_SCHEMA.userStats.userId)
        )
        .where(eq(DB_SCHEMA.user.id, userId))
        .limit(1);

      const data = result[0];
      if (!data) {
        return null;
      }

      // Check visibility
      const isOwner = viewerId === userId;
      const isPublic = data.profile?.isPublic ?? true;

      if (!(isOwner || isPublic)) {
        return { isPrivate: true, user: data.user };
      }

      return {
        isPrivate: false,
        user: data.user,
        profile: data.profile,
        stats: data.profile?.showStats !== false ? data.stats : null,
      };
    },

    /**
     * Get a user's public profile by username
     */
    async getProfileByUsername(username: string, viewerId?: UserId) {
      const userResult = await db
        .select({ id: DB_SCHEMA.user.id })
        .from(DB_SCHEMA.user)
        .where(eq(DB_SCHEMA.user.username, username.toLowerCase()))
        .limit(1);

      const user = userResult[0];
      if (!user) {
        return null;
      }

      return this.getProfileByUserId(user.id, viewerId);
    },

    /**
     * Update a user's profile
     */
    async updateProfile(
      userId: UserId,
      data: {
        bio?: string;
        avatarUrl?: string;
        isPublic?: boolean;
        showStats?: boolean;
        showBetHistory?: boolean;
        twitterHandle?: string;
        telegramHandle?: string;
      }
    ) {
      // Ensure profile exists
      await this.getOrCreateProfile(userId);

      // Sanitize bio length
      if (data.bio && data.bio.length > 160) {
        data.bio = data.bio.slice(0, 160);
      }

      // Clean social handles
      if (data.twitterHandle) {
        data.twitterHandle = data.twitterHandle.replace(LEADING_AT_REGEX, "");
      }
      if (data.telegramHandle) {
        data.telegramHandle = data.telegramHandle.replace(LEADING_AT_REGEX, "");
      }

      const updated = await db
        .update(DB_SCHEMA.userProfile)
        .set(data)
        .where(eq(DB_SCHEMA.userProfile.userId, userId))
        .returning();

      logger.info(
        { userId, fields: Object.keys(data) },
        "Updated user profile"
      );

      return updated[0];
    },

    /**
     * Get a user's bet history (for public profile)
     */
    async getBetHistory(options: {
      userId: UserId;
      viewerId?: UserId;
      limit?: number;
      offset?: number;
    }) {
      const { userId, viewerId, limit = 20, offset = 0 } = options;

      // Check if history is visible
      const profile = await db
        .select()
        .from(DB_SCHEMA.userProfile)
        .where(eq(DB_SCHEMA.userProfile.userId, userId))
        .limit(1);

      const isOwner = viewerId === userId;
      const canView =
        isOwner ||
        (profile[0]?.isPublic !== false &&
          profile[0]?.showBetHistory !== false);

      if (!canView) {
        return { visible: false, bets: [] };
      }

      const bets = await db
        .select({
          bet: DB_SCHEMA.bet,
          market: {
            id: DB_SCHEMA.market.id,
            title: DB_SCHEMA.market.title,
            result: DB_SCHEMA.market.result,
            status: DB_SCHEMA.market.status,
          },
        })
        .from(DB_SCHEMA.bet)
        .innerJoin(
          DB_SCHEMA.market,
          eq(DB_SCHEMA.bet.marketId, DB_SCHEMA.market.id)
        )
        .where(eq(DB_SCHEMA.bet.userId, userId))
        .orderBy(sql`${DB_SCHEMA.bet.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return {
        visible: true,
        bets: bets.map((b) => ({
          id: b.bet.id,
          vote: b.bet.vote,
          amount: Number(b.bet.amount),
          status: b.bet.status,
          payout: b.bet.payout ? Number(b.bet.payout) : null,
          createdAt: b.bet.createdAt,
          market: b.market,
        })),
      };
    },

    /**
     * Update follower counts (called by follow service)
     */
    async updateFollowerCount(userId: UserId, delta: number) {
      await db
        .update(DB_SCHEMA.userProfile)
        .set({
          followerCount: sql`GREATEST(0, ${DB_SCHEMA.userProfile.followerCount} + ${delta})`,
        })
        .where(eq(DB_SCHEMA.userProfile.userId, userId));
    },

    /**
     * Update following count (called by follow service)
     */
    async updateFollowingCount(userId: UserId, delta: number) {
      await db
        .update(DB_SCHEMA.userProfile)
        .set({
          followingCount: sql`GREATEST(0, ${DB_SCHEMA.userProfile.followingCount} + ${delta})`,
        })
        .where(eq(DB_SCHEMA.userProfile.userId, userId));
    },

    /**
     * Set username for a user (claims a unique username)
     */
    async setUsername(userId: UserId, username: string) {
      const normalizedUsername = username.toLowerCase();

      // Check if username is already taken
      const existing = await db
        .select({ id: DB_SCHEMA.user.id })
        .from(DB_SCHEMA.user)
        .where(eq(DB_SCHEMA.user.username, normalizedUsername))
        .limit(1);

      if (existing[0] && existing[0].id !== userId) {
        return { success: false, error: "USERNAME_TAKEN" as const };
      }

      // Update user with username
      const [updated] = await db
        .update(DB_SCHEMA.user)
        .set({
          username: normalizedUsername,
          displayUsername: username,
        })
        .where(eq(DB_SCHEMA.user.id, userId))
        .returning();

      if (!updated) {
        return { success: false, error: "UPDATE_FAILED" as const };
      }

      logger.info({ userId, username: normalizedUsername }, "Username set");
      return { success: true, username: normalizedUsername };
    },
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
