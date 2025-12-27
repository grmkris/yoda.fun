import { ORPCError } from "@orpc/server";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure } from "../api";

export const rewardRouter = {
  getSummary: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);
    return context.rewardService.getRewardSummary(userId);
  }),

  getClaimableCount: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);
    const count = await context.rewardService.getClaimableCount(userId);
    return { count };
  }),

  claimDaily: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);

    try {
      const claim = await context.rewardService.claimDailyStreak(userId);
      return {
        success: true,
        amount: Number(claim.amount),
        streakDay: claim.metadata?.streakDay ?? 1,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cannot claim")) {
        throw new ORPCError("BAD_REQUEST", { message: error.message });
      }
      throw error;
    }
  }),

  getDailyStatus: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);
    return context.rewardService.canClaimDailyStreak(userId);
  }),

  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z
          .number()
          .min(NUMERIC_CONSTANTS.pagination.minLimit)
          .max(NUMERIC_CONSTANTS.pagination.maxLimit)
          .optional()
          .default(NUMERIC_CONSTANTS.pagination.defaultLimit),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);
      const rewards = await context.rewardService.getRewardHistory(
        userId,
        input
      );
      return { rewards, limit: input.limit, offset: input.offset };
    }),

  getReferralCode: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);
    const code = await context.rewardService.getReferralCode(userId);
    return { code };
  }),

  applyReferralCode: protectedProcedure
    .input(z.object({ code: z.string().min(1).max(20) }))
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      try {
        const result = await context.rewardService.applyReferralCode(
          userId,
          input.code
        );
        return { success: true, referrerId: result.referrerId };
      } catch (error) {
        if (error instanceof Error) {
          throw new ORPCError("BAD_REQUEST", { message: error.message });
        }
        throw error;
      }
    }),
};
