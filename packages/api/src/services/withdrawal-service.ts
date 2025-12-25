import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { desc, eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { QueueClient } from "@yoda.fun/queue";
import type { UserId, WithdrawalId } from "@yoda.fun/shared/typeid";

const WALLET_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

interface WithdrawalServiceDeps {
  db: Database;
  logger: Logger;
  queue?: QueueClient;
}

export function createWithdrawalService({
  deps,
}: {
  deps: WithdrawalServiceDeps;
}) {
  const { db, logger, queue } = deps;

  return {
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

      if (!WALLET_ADDRESS_REGEX.test(walletAddress)) {
        throw new Error("Invalid wallet address");
      }

      const result = await db.transaction(async (tx) => {
        const [balance] = await tx
          .select()
          .from(DB_SCHEMA.userBalance)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .limit(1);

        const availableBalance = balance ? Number(balance.availableBalance) : 0;

        if (availableBalance < amount) {
          throw new Error(
            `Insufficient balance: ${availableBalance.toFixed(2)} < ${amount.toFixed(2)}`
          );
        }

        await tx
          .update(DB_SCHEMA.userBalance)
          .set({
            availableBalance: sql`${DB_SCHEMA.userBalance.availableBalance} - ${amount.toFixed(2)}`,
            totalWithdrawn: sql`${DB_SCHEMA.userBalance.totalWithdrawn} + ${amount.toFixed(2)}`,
          })
          .where(eq(DB_SCHEMA.userBalance.userId, userId));

        const [txRecord] = await tx
          .insert(DB_SCHEMA.transaction)
          .values({
            userId,
            type: "WITHDRAWAL",
            amount: amount.toFixed(2),
            status: "PENDING",
            metadata: { walletAddress },
          })
          .returning();

        const [withdrawal] = await tx
          .insert(DB_SCHEMA.withdrawal)
          .values({
            userId,
            amount: amount.toFixed(2),
            status: "PENDING",
            walletAddress,
            transactionId: txRecord?.id,
            requestedAmount: amount.toFixed(2),
          })
          .returning();

        return { withdrawal, transaction: txRecord };
      });

      logger.info(
        { userId, amount, walletAddress, withdrawalId: result.withdrawal?.id },
        "Withdrawal requested"
      );

      if (queue && result.withdrawal?.id) {
        await queue.addJob("process-withdrawal", {
          withdrawalId: result.withdrawal.id,
        });
        logger.info(
          { withdrawalId: result.withdrawal.id },
          "Withdrawal job queued"
        );
      }

      return result;
    },

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

    async getWithdrawal(userId: UserId, withdrawalId: WithdrawalId) {
      const [withdrawal] = await db
        .select()
        .from(DB_SCHEMA.withdrawal)
        .where(eq(DB_SCHEMA.withdrawal.id, withdrawalId))
        .limit(1);

      if (!withdrawal || withdrawal.userId !== userId) {
        throw new Error("Withdrawal not found");
      }
      return withdrawal;
    },
  };
}

export type WithdrawalService = ReturnType<typeof createWithdrawalService>;
