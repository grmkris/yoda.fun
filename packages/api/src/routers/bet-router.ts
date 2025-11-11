import { ORPCError } from "@orpc/server";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { MarketId, UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure } from "../api";

export const betRouter = {
  /**
   * Place a vote on a market
   */
  place: protectedProcedure
    .input(
      z.object({
        marketId: MarketId,
        vote: z.enum(["YES", "NO"]),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      try {
        const result = await context.betService.placeBet(userId, input);

        return {
          success: true,
          betId: result.id,
          marketId: result.marketId,
          vote: result.vote,
          message: `Vote placed successfully! You voted ${input.vote}.`,
        };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("not found")) {
            throw new ORPCError("NOT_FOUND");
          }
          if (error.message.includes("not active")) {
            throw new ORPCError("BAD_REQUEST");
          }
          if (error.message.includes("ended")) {
            throw new ORPCError("BAD_REQUEST");
          }
          if (error.message.includes("already placed")) {
            throw new ORPCError("BAD_REQUEST");
          }
        }
        throw error;
      }
    }),

  /**
   * Get user's vote history
   */
  history: protectedProcedure
    .input(
      z.object({
        status: z.enum(["ACTIVE", "WON", "LOST", "REFUNDED"]).optional(),
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

      const bets = await context.betService.getBetHistory(userId, {
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        bets,
        limit: input.limit,
        offset: input.offset,
      };
    }),
};
