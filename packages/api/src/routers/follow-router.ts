import { ORPCError } from "@orpc/server";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../api";

export const followRouter = {
  /**
   * Toggle follow status for a user
   */
  toggle: protectedProcedure
    .input(z.object({ userId: UserId }))
    .handler(async ({ context, input }) => {
      const followerId = UserId.parse(context.session.user.id);

      if (followerId === input.userId) {
        throw new ORPCError("BAD_REQUEST");
      }

      const result = await context.followService.toggleFollow(
        followerId,
        input.userId
      );

      return result;
    }),

  /**
   * Follow a user
   */
  follow: protectedProcedure
    .input(z.object({ userId: UserId }))
    .handler(async ({ context, input }) => {
      const followerId = UserId.parse(context.session.user.id);

      if (followerId === input.userId) {
        throw new ORPCError("BAD_REQUEST");
      }

      const result = await context.followService.follow(
        followerId,
        input.userId
      );

      return { success: true, alreadyFollowing: result.alreadyFollowing };
    }),

  /**
   * Unfollow a user
   */
  unfollow: protectedProcedure
    .input(z.object({ userId: UserId }))
    .handler(async ({ context, input }) => {
      const followerId = UserId.parse(context.session.user.id);

      const result = await context.followService.unfollow(
        followerId,
        input.userId
      );

      return { success: true, wasFollowing: result.wasFollowing };
    }),

  /**
   * Check if current user is following another user
   */
  isFollowing: protectedProcedure
    .input(z.object({ userId: UserId }))
    .handler(async ({ context, input }) => {
      const followerId = UserId.parse(context.session.user.id);

      const isFollowing = await context.followService.isFollowing(
        followerId,
        input.userId
      );

      return { isFollowing };
    }),

  /**
   * Get a user's followers
   */
  followers: publicProcedure
    .input(
      z.object({
        userId: UserId,
        limit: z
          .number()
          .min(1)
          .max(NUMERIC_CONSTANTS.pagination.maxLimit)
          .optional()
          .default(NUMERIC_CONSTANTS.pagination.defaultLimit),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .handler(async ({ context, input }) => {
      const followers = await context.followService.getFollowers({
        userId: input.userId,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        users: followers,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get users that a user is following
   */
  following: publicProcedure
    .input(
      z.object({
        userId: UserId,
        limit: z
          .number()
          .min(1)
          .max(NUMERIC_CONSTANTS.pagination.maxLimit)
          .optional()
          .default(NUMERIC_CONSTANTS.pagination.defaultLimit),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .handler(async ({ context, input }) => {
      const following = await context.followService.getFollowing({
        userId: input.userId,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        users: following,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get follow counts for a user
   */
  counts: publicProcedure
    .input(z.object({ userId: UserId }))
    .handler(async ({ context, input }) => {
      const counts = await context.followService.getFollowCounts(input.userId);

      return counts;
    }),
};
