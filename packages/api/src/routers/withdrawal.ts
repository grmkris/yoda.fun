import { ORPCError } from "@orpc/server";
import { transaction, withdrawal } from "@yoda.fun/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../api";
import { deductFromAvailableBalance } from "../services/balance";

export const withdrawalRouter = {
  /**
   * Request a withdrawal
   */
  request: protectedProcedure
    .input(
      z.object({
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
        walletAddress: z.string().min(1, "Wallet address is required"),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const amount = input.amount;

      // Validate minimum withdrawal
      const minWithdrawal = 5.0;
      if (Number.parseFloat(amount) < minWithdrawal) {
        throw new ORPCError({
          code: "BAD_REQUEST",
          message: `Minimum withdrawal is $${minWithdrawal}`,
        });
      }

      // Create withdrawal in a transaction
      const result = await context.db.transaction(async (tx) => {
        try {
          // Deduct from available balance (will throw if insufficient)
          await deductFromAvailableBalance(tx, userId, amount);

          // Create transaction record
          const [txRecord] = await tx
            .insert(transaction)
            .values({
              userId,
              type: "WITHDRAWAL",
              amount,
              status: "PENDING",
              metadata: {
                walletAddress: input.walletAddress,
              },
            })
            .returning();

          // Create withdrawal record
          const [withdrawalRecord] = await tx
            .insert(withdrawal)
            .values({
              userId,
              amount,
              status: "PENDING",
              walletAddress: input.walletAddress,
              transactionId: txRecord.id,
            })
            .returning();

          return withdrawalRecord;
        } catch (error) {
          if (error instanceof Error && error.message.includes("Insufficient")) {
            throw new ORPCError({
              code: "BAD_REQUEST",
              message: "Insufficient balance for withdrawal",
            });
          }
          throw error;
        }
      });

      return {
        success: true,
        withdrawalId: result.id,
        amount: result.amount,
        status: result.status,
        message:
          "Withdrawal request submitted. Processing typically takes 24-48 hours.",
      };
    }),

  /**
   * List user's withdrawals
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const withdrawals = await context.db
        .select()
        .from(withdrawal)
        .where(eq(withdrawal.userId, userId))
        .orderBy(withdrawal.createdAt)
        .limit(input.limit)
        .offset(input.offset);

      return {
        withdrawals,
        limit: input.limit,
        offset: input.offset,
      };
    }),
};
