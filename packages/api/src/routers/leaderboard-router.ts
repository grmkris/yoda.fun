import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../api";

const periodSchema = z.enum(["daily", "weekly", "monthly", "allTime"]);
const metricSchema = z.enum(["profit", "winRate", "streak"]);

export const leaderboardRouter = {
  /**
   * Get leaderboard for a specific period and metric
   */
  get: publicProcedure
    .input(
      z.object({
        period: periodSchema.default("allTime"),
        metric: metricSchema.default("profit"),
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .default(NUMERIC_CONSTANTS.pagination.defaultLimit),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .handler(async ({ context, input }) => {
      const leaderboard = await context.leaderboardService.getLeaderboard({
        period: input.period,
        metric: input.metric,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        period: input.period,
        metric: input.metric,
        entries: leaderboard,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get the current user's rank
   */
  myRank: protectedProcedure
    .input(
      z.object({
        period: periodSchema.default("allTime"),
        metric: metricSchema.default("profit"),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      const rank = await context.leaderboardService.getUserRank({
        userId,
        period: input.period,
        metric: input.metric,
      });

      return rank;
    }),

  /**
   * Get users near the current user on the leaderboard
   */
  nearby: protectedProcedure
    .input(
      z.object({
        period: periodSchema.default("allTime"),
        metric: metricSchema.default("profit"),
        range: z.number().min(1).max(10).optional().default(2),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      const nearby = await context.leaderboardService.getNearbyUsers({
        userId,
        period: input.period,
        metric: input.metric,
        range: input.range,
      });

      return nearby;
    }),

  /**
   * Get a specific user's rank
   */
  userRank: publicProcedure
    .input(
      z.object({
        userId: UserId,
        period: periodSchema.default("allTime"),
        metric: metricSchema.default("profit"),
      })
    )
    .handler(async ({ context, input }) => {
      const rank = await context.leaderboardService.getUserRank({
        userId: input.userId,
        period: input.period,
        metric: input.metric,
      });

      return rank;
    }),
};
