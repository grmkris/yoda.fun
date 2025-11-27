import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../api";

export const activityRouter = {
  /**
   * Get global activity feed (public activities from all users)
   */
  global: publicProcedure
    .input(
      z.object({
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
      const activities = await context.activityService.getGlobalFeed({
        limit: input.limit,
        offset: input.offset,
      });

      return {
        activities,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get activity feed from users the current user follows
   */
  following: protectedProcedure
    .input(
      z.object({
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
      const userId = UserId.parse(context.session.user.id);

      const activities = await context.activityService.getFollowingFeed({
        userId,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        activities,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get a specific user's activity
   */
  user: publicProcedure
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

      const result = await context.activityService.getUserActivity({
        userId: input.userId,
        viewerId,
        limit: input.limit,
        offset: input.offset,
      });

      return result;
    }),
};
