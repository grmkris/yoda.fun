import { ORPCError } from "@orpc/server";
import { MarketId, UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../api";

const feedbackTypeSchema = z.enum(["RESOLUTION", "QUALITY"]);

export const agentRouter = {
  /**
   * Get Yoda's agent profile with reputation scores
   */
  profile: publicProcedure.handler(async ({ context }) => {
    const profile = await context.erc8004Service.getAgentProfile();

    if (!profile) {
      throw new ORPCError("NOT_FOUND", { message: "Agent not registered" });
    }

    return profile;
  }),

  /**
   * Get feedbackAuth signature for submitting on-chain feedback
   */
  getFeedbackAuth: protectedProcedure
    .input(
      z.object({
        marketId: MarketId,
        feedbackType: feedbackTypeSchema,
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      // Check if user can give this feedback
      const canGive = await context.erc8004Service.canGiveFeedback(
        userId,
        input.marketId,
        input.feedbackType
      );

      if (!canGive.canGive) {
        throw new ORPCError("BAD_REQUEST", {
          message: canGive.reason ?? "Cannot give feedback",
        });
      }

      const result = await context.erc8004Service.generateFeedbackAuth(
        userId,
        input.marketId,
        input.feedbackType
      );

      return result;
    }),

  /**
   * Record feedback after on-chain submission
   */
  recordFeedback: protectedProcedure
    .input(
      z.object({
        marketId: MarketId,
        feedbackType: feedbackTypeSchema,
        score: z.number().min(1).max(5),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        onChainIndex: z.number().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      await context.erc8004Service.recordFeedback(
        userId,
        input.marketId,
        input.feedbackType,
        input.score,
        input.txHash,
        input.onChainIndex
      );

      return { success: true };
    }),

  /**
   * Get user's feedback for a specific market
   */
  myFeedback: protectedProcedure
    .input(z.object({ marketId: MarketId }))
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      const feedback = await context.erc8004Service.getUserFeedback(
        userId,
        input.marketId
      );

      return feedback;
    }),

  /**
   * Check if user can give feedback for a market
   */
  canGiveFeedback: protectedProcedure
    .input(
      z.object({
        marketId: MarketId,
        feedbackType: feedbackTypeSchema,
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      return await context.erc8004Service.canGiveFeedback(
        userId,
        input.marketId,
        input.feedbackType
      );
    }),

  /**
   * Get recent feedback history
   */
  recentFeedback: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .handler(async ({ context, input }) => {
      return await context.erc8004Service.getRecentFeedback(input.limit);
    }),
};
