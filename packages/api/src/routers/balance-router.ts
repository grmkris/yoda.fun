import { UserId } from "@yoda.fun/shared/typeid";
import { protectedProcedure } from "../api";

export const balanceRouter = {
  /**
   * Get user's current balance
   */
  get: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);

    const balance = await context.balanceService.getBalance(userId);

    return {
      available: balance.available,
      pending: balance.pending,
      totalDeposited: balance.totalDeposited,
      totalWithdrawn: balance.totalWithdrawn,
    };
  }),
};
