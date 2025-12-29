import { ORPCError } from "@orpc/server";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure } from "../api";

export const rewardRouter = {
  /**
   * Get reward summary (win streaks, referrals, etc.)
   */
  getSummary: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);
    return await context.rewardService.getRewardSummary(userId);
  }),

  /**
   * Get count of claimable rewards
   */
  getClaimableCount: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);
    const count = await context.rewardService.getClaimableCount(userId);
    return { count };
  }),

  /**
   * Get reward history
   */
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

  /**
   * Get user's referral code
   */
  getReferralCode: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);
    const code = await context.rewardService.getReferralCode(userId);
    return { code };
  }),

  /**
   * Apply a referral code
   */
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
