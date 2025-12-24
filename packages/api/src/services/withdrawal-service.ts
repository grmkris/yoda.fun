import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { desc, eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { UserId, WithdrawalId } from "@yoda.fun/shared/typeid";

const WALLET_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

interface WithdrawalServiceDeps {
  db: Database;
  logger: Logger;
}

export function createWithdrawalService({
  deps,
}: {
  deps: WithdrawalServiceDeps;
}) {
  const { db, logger } = deps;

  return {
    /**
     * Request a withdrawal
     * Validates balance, deducts funds, creates withdrawal record
     */
    async requestWithdrawal(
      userId: UserId,
      input: {
        amount: number;
        walletAddress: string;
      }
    ) {
      const { amount, walletAddress } = input;

      if (amount <= 0) {
        throw new Error("Withdrawal amount must be greater than 0");
      }

      // Validate wallet address format
      if (!WALLET_ADDRESS_REGEX.test(walletAddress)) {
        throw new Error("Invalid wallet address");
      }

      const result = await db.transaction(async (tx) => {
        // Get user's balance
        const balanceRecords = await tx
          .select()
          .from(DB_SCHEMA.userBalance)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .limit(1);

        const balance = balanceRecords[0];
        const availableBalance = balance ? Number(balance.availableBalance) : 0;

        if (availableBalance < amount) {
          throw new Error(
            `Insufficient balance: ${availableBalance.toFixed(2)} < ${amount.toFixed(2)}`
          );
        }

        // Deduct from available balance
        await tx
          .update(DB_SCHEMA.userBalance)
          .set({
            availableBalance: sql`${DB_SCHEMA.userBalance.availableBalance} - ${amount.toFixed(2)}`,
            totalWithdrawn: sql`${DB_SCHEMA.userBalance.totalWithdrawn} + ${amount.toFixed(2)}`,
          })
          .where(eq(DB_SCHEMA.userBalance.userId, userId));

        // Create transaction record
        const txRecord = await tx
          .insert(DB_SCHEMA.transaction)
          .values({
            userId,
            type: "WITHDRAWAL",
            amount: amount.toFixed(2),
            status: "PENDING",
            metadata: { walletAddress },
          })
          .returning();

        // Create withdrawal record
        const withdrawalRecord = await tx
          .insert(DB_SCHEMA.withdrawal)
          .values({
            userId,
            amount: amount.toFixed(2),
            status: "PENDING",
            walletAddress,
            transactionId: txRecord[0]?.id,
            requestedAmount: amount.toFixed(2),
          })
          .returning();

        return {
          withdrawal: withdrawalRecord[0],
          transaction: txRecord[0],
        };
      });

      logger.info(
        {
          userId,
          amount,
          walletAddress,
          withdrawalId: result.withdrawal?.id,
        },
        "Withdrawal requested"
      );

      return result;
    },

    /**
     * Get user's withdrawal history
     */
    async getWithdrawals(
      userId: UserId,
      input: {
        limit: number;
        offset: number;
      }
    ) {
      const withdrawals = await db
        .select()
        .from(DB_SCHEMA.withdrawal)
        .where(eq(DB_SCHEMA.withdrawal.userId, userId))
        .orderBy(desc(DB_SCHEMA.withdrawal.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return withdrawals;
    },

    /**
     * Get a single withdrawal by ID
     */
    async getWithdrawal(userId: UserId, withdrawalId: WithdrawalId) {
      const withdrawals = await db
        .select()
        .from(DB_SCHEMA.withdrawal)
        .where(eq(DB_SCHEMA.withdrawal.id, withdrawalId))
        .limit(1);

      const withdrawal = withdrawals[0];
      if (!withdrawal || withdrawal.userId !== userId) {
        throw new Error("Withdrawal not found");
      }

      return withdrawal;
    },
  };
}

export type WithdrawalService = ReturnType<typeof createWithdrawalService>;
