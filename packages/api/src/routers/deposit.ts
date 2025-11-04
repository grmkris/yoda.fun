import { ORPCError } from "@orpc/server";
import { deposit, transaction } from "@yoda.fun/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../api";
import { addToAvailableBalance } from "../services/balance";

export const depositRouter = {
  /**
   * Initiate a deposit
   * In a real implementation, this would generate a deposit address or payment link
   */
  initiate: protectedProcedure
    .input(
      z.object({
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const amount = input.amount;

      // Validate minimum deposit
      const minDeposit = 1.0;
      if (Number.parseFloat(amount) < minDeposit) {
        throw new ORPCError({
          code: "BAD_REQUEST",
          message: `Minimum deposit is $${minDeposit}`,
        });
      }

      // TODO: In a real implementation, integrate with a payment provider
      // For now, return instructions for manual deposit
      return {
        message: "Please send crypto to the address below",
        amount,
        // TODO: Generate or retrieve user's deposit address from wallet service
        depositAddress: "0x...", // Placeholder
        instructions:
          "Send the exact amount to the address above. Deposits are typically confirmed within 10-15 minutes.",
      };
    }),

  /**
   * Confirm a deposit with transaction hash
   */
  confirm: protectedProcedure
    .input(
      z.object({
        txHash: z.string().min(1, "Transaction hash is required"),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
        walletAddress: z.string().min(1, "Wallet address is required"),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      // Check if deposit with this txHash already exists
      const existingDeposit = await context.db
        .select()
        .from(deposit)
        .where(eq(deposit.txHash, input.txHash))
        .limit(1);

      if (existingDeposit.length > 0) {
        throw new ORPCError({
          code: "BAD_REQUEST",
          message: "This transaction has already been submitted",
        });
      }

      // Create transaction record and deposit record in a transaction
      const result = await context.db.transaction(async (tx) => {
        // Create transaction record
        const [txRecord] = await tx
          .insert(transaction)
          .values({
            userId,
            type: "DEPOSIT",
            amount: input.amount,
            status: "PENDING",
            txHash: input.txHash,
            metadata: {
              walletAddress: input.walletAddress,
            },
          })
          .returning();

        // Create deposit record
        const [depositRecord] = await tx
          .insert(deposit)
          .values({
            userId,
            amount: input.amount,
            status: "PENDING",
            txHash: input.txHash,
            walletAddress: input.walletAddress,
            transactionId: txRecord.id,
          })
          .returning();

        // TODO: In a real implementation, verify the transaction on-chain
        // For now, auto-confirm (in production, this would be done by a webhook/worker)
        await tx
          .update(deposit)
          .set({
            status: "CONFIRMED",
            confirmedAt: new Date(),
          })
          .where(eq(deposit.id, depositRecord.id));

        await tx
          .update(transaction)
          .set({ status: "COMPLETED" })
          .where(eq(transaction.id, txRecord.id));

        // Add to user's available balance
        await addToAvailableBalance(tx, userId, input.amount);

        return depositRecord;
      });

      return {
        success: true,
        depositId: result.id,
        amount: result.amount,
        status: "CONFIRMED",
      };
    }),

  /**
   * List user's deposits
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

      const deposits = await context.db
        .select()
        .from(deposit)
        .where(eq(deposit.userId, userId))
        .orderBy(deposit.createdAt)
        .limit(input.limit)
        .offset(input.offset);

      return {
        deposits,
        limit: input.limit,
        offset: input.offset,
      };
    }),
};
