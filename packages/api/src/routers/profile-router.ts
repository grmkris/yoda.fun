import { ORPCError } from "@orpc/server";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../api";

export const profileRouter = {
  /**
   * Get a user's public profile by userId
   */
  getById: publicProcedure
    .input(z.object({ userId: UserId }))
    .handler(async ({ context, input }) => {
      const viewerId = context.session?.user?.id
        ? UserId.parse(context.session.user.id)
        : undefined;

      const profile = await context.profileService.getProfileByUserId(
        input.userId,
        viewerId
      );

      if (!profile) {
        throw new ORPCError("NOT_FOUND");
      }

      return profile;
    }),

  /**
   * Get a user's public profile by username
   */
  getByUsername: publicProcedure
    .input(z.object({ username: z.string().min(1).max(50) }))
    .handler(async ({ context, input }) => {
      const viewerId = context.session?.user?.id
        ? UserId.parse(context.session.user.id)
        : undefined;

      const profile = await context.profileService.getProfileByUsername(
        input.username,
        viewerId
      );

      if (!profile) {
        throw new ORPCError("NOT_FOUND");
      }

      return profile;
    }),

  /**
   * Get current user's own profile
   */
  me: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);

    const profile = await context.profileService.getProfileByUserId(
      userId,
      userId
    );

    return profile;
  }),

  /**
   * Update current user's profile
   */
  update: protectedProcedure
    .input(
      z.object({
        bio: z.string().max(160).optional(),
        avatarUrl: z.string().url().optional(),
        isPublic: z.boolean().optional(),
        showStats: z.boolean().optional(),
        showBetHistory: z.boolean().optional(),
        twitterHandle: z.string().max(50).optional(),
        telegramHandle: z.string().max(50).optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      const updated = await context.profileService.updateProfile(userId, input);

      return updated;
    }),

  /**
   * Get a user's bet history (if visible)
   */
  bets: publicProcedure
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
      const viewerId = context.session?.user?.id
        ? UserId.parse(context.session.user.id)
        : undefined;

      const result = await context.profileService.getBetHistory({
        userId: input.userId,
        viewerId,
        limit: input.limit,
        offset: input.offset,
      });

      return result;
    }),
};
