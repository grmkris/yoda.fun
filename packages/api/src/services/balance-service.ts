import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { UserId } from "@yoda.fun/shared/typeid";

// Helper to safely get first element
const firstOrThrow = <T>(arr: T[], msg: string): T => {
  const first = arr[0];
  if (!first) {
    throw new Error(msg);
  }
  return first;
};

type BalanceServiceDeps = {
  db: Database;
  logger: Logger;
};

export type TransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "BET_PLACED"
  | "PAYOUT"
  | "REFUND";

export function createBalanceService({ deps }: { deps: BalanceServiceDeps }) {
  const { db, logger } = deps;

  return {
    /**
     * Get or create a user's balance record
     */
    async getOrCreateBalance(userId: UserId) {
      const existing = await db
        .select()
        .from(DB_SCHEMA.userBalance)
        .where(eq(DB_SCHEMA.userBalance.userId, userId))
        .limit(1);

      if (existing[0]) {
        return existing[0];
      }

      const created = await db
        .insert(DB_SCHEMA.userBalance)
        .values({ userId })
        .returning();

      logger.info({ userId }, "Created new balance record");
      return firstOrThrow(created, "Failed to create balance record");
    },

    /**
     * Get a user's current balance
     */
    async getBalance(userId: UserId) {
      const balance = await this.getOrCreateBalance(userId);
      return {
        available: Number(balance.availableBalance),
        pending: Number(balance.pendingBalance),
        totalDeposited: Number(balance.totalDeposited),
        totalWithdrawn: Number(balance.totalWithdrawn),
      };
    },

    /**
     * Credit funds to user's available balance
     */
    async creditBalance(
      userId: UserId,
      amount: number,
      txType: TransactionType,
      metadata?: Record<string, unknown>
    ) {
      const result = await db.transaction(async (tx) => {
        // Ensure balance exists
        const balanceRecords = await tx
          .select()
          .from(DB_SCHEMA.userBalance)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .limit(1);

        let balance = balanceRecords[0];
        if (!balance) {
          const created = await tx
            .insert(DB_SCHEMA.userBalance)
            .values({ userId })
            .returning();
          balance = firstOrThrow(created, "Failed to create balance record");
        }

        // Update balance
        const updateData: Record<string, unknown> = {
          availableBalance: sql`${DB_SCHEMA.userBalance.availableBalance} + ${amount.toFixed(2)}`,
        };

        if (txType === "DEPOSIT") {
          updateData.totalDeposited = sql`${DB_SCHEMA.userBalance.totalDeposited} + ${amount.toFixed(2)}`;
        }

        const updated = await tx
          .update(DB_SCHEMA.userBalance)
          .set(updateData)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .returning();

        // Create transaction record
        const txRecord = await tx
          .insert(DB_SCHEMA.transaction)
          .values({
            userId,
            type: txType,
            amount: amount.toFixed(2),
            status: "COMPLETED",
            metadata,
          })
          .returning();

        return { balance: updated[0], transaction: txRecord[0] };
      });

      logger.info(
        { userId, amount, txType, transactionId: result.transaction?.id },
        "Credited balance"
      );

      return result;
    },

    /**
     * Debit funds from user's available balance
     */
    async debitBalance(
      userId: UserId,
      amount: number,
      txType: TransactionType,
      metadata?: Record<string, unknown>
    ) {
      const result = await db.transaction(async (tx) => {
        // Get current balance
        const balanceRecords = await tx
          .select()
          .from(DB_SCHEMA.userBalance)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .limit(1);

        const balance = balanceRecords[0];
        if (!balance) {
          throw new Error("Balance record not found");
        }

        const available = Number(balance.availableBalance);
        if (available < amount) {
          throw new Error(
            `Insufficient balance: ${available.toFixed(2)} < ${amount.toFixed(2)}`
          );
        }

        // Update balance
        const updateData: Record<string, unknown> = {
          availableBalance: sql`${DB_SCHEMA.userBalance.availableBalance} - ${amount.toFixed(2)}`,
        };

        if (txType === "WITHDRAWAL") {
          updateData.totalWithdrawn = sql`${DB_SCHEMA.userBalance.totalWithdrawn} + ${amount.toFixed(2)}`;
        }

        const updated = await tx
          .update(DB_SCHEMA.userBalance)
          .set(updateData)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .returning();

        // Create transaction record
        const txRecord = await tx
          .insert(DB_SCHEMA.transaction)
          .values({
            userId,
            type: txType,
            amount: amount.toFixed(2),
            status: "COMPLETED",
            metadata,
          })
          .returning();

        return { balance: updated[0], transaction: txRecord[0] };
      });

      logger.info(
        { userId, amount, txType, transactionId: result.transaction?.id },
        "Debited balance"
      );

      return result;
    },
  };
}

export type BalanceService = ReturnType<typeof createBalanceService>;
