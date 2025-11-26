import { ORPCError } from "@orpc/server";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { UserId, WithdrawalId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure } from "../api";

export const withdrawalRouter = {
  /**
   * Request a withdrawal
   */
  request: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      try {
        const result = await context.withdrawalService.requestWithdrawal(
          userId,
          input
        );

        return {
          success: true,
          withdrawalId: result.withdrawal?.id,
          amount: input.amount,
          walletAddress: input.walletAddress,
          status: "PENDING",
        };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Insufficient balance")) {
            throw new ORPCError("BAD_REQUEST", {
              message: error.message,
            });
          }
          if (error.message.includes("Invalid wallet")) {
            throw new ORPCError("BAD_REQUEST", {
              message: error.message,
            });
          }
        }
        throw error;
      }
    }),

  /**
   * Get user's withdrawal history
   */
  list: protectedProcedure
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

      const withdrawals = await context.withdrawalService.getWithdrawals(
        userId,
        input
      );

      return {
        withdrawals,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get a single withdrawal by ID
   */
  get: protectedProcedure
    .input(
      z.object({
        withdrawalId: WithdrawalId,
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      try {
        const withdrawal = await context.withdrawalService.getWithdrawal(
          userId,
          input.withdrawalId
        );

        return withdrawal;
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new ORPCError("NOT_FOUND");
        }
        throw error;
      }
    }),
};
