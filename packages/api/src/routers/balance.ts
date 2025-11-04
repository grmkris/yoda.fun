import { userBalance } from "@yoda.fun/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../api";
import { getOrCreateUserBalance, getTransactionHistory } from "../services/balance";

export const balanceRouter = {
  /**
   * Get user's balance summary
   */
  get: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const balance = await getOrCreateUserBalance(context.db, userId);

    return {
      availableBalance: balance.availableBalance,
      pendingBalance: balance.pendingBalance,
      totalDeposited: balance.totalDeposited,
      totalWithdrawn: balance.totalWithdrawn,
    };
  }),

  /**
   * Get transaction history
   */
  history: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        type: z
          .enum(["DEPOSIT", "WITHDRAWAL", "BET_PLACED", "PAYOUT", "REFUND"])
          .optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const transactions = await getTransactionHistory(context.db, userId, {
        limit: input.limit,
        offset: input.offset,
        type: input.type,
      });

      return {
        transactions,
        limit: input.limit,
        offset: input.offset,
      };
    }),
};
