import { createUsdcClient } from "@yoda.fun/blockchain";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { QueueClient } from "@yoda.fun/queue";
import type { ProcessWithdrawalJob } from "@yoda.fun/queue/jobs/process-withdrawal-job";
import type { EvmNetwork } from "@yoda.fun/shared/constants";
import type { WithdrawalId } from "@yoda.fun/shared/typeid";

export interface WithdrawalWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  treasuryPrivateKey: `0x${string}`;
  network: EvmNetwork;
}

export function createWithdrawalWorker(config: WithdrawalWorkerConfig): {
  close: () => Promise<void>;
} {
  const { queue, db, logger, treasuryPrivateKey, network } = config;

  const usdcClient = createUsdcClient({
    privateKey: treasuryPrivateKey,
    network,
    logger,
  });

  logger.info(
    { treasuryAddress: usdcClient.getAddress(), network },
    "Starting withdrawal worker"
  );

  const worker = queue.createWorker<"process-withdrawal">(
    "process-withdrawal",
    async (job: ProcessWithdrawalJob) => {
      const { withdrawalId } = job;
      const wId = withdrawalId as WithdrawalId;

      logger.info({ withdrawalId }, "Processing withdrawal");

      const [withdrawal] = await db
        .select()
        .from(DB_SCHEMA.withdrawal)
        .where(eq(DB_SCHEMA.withdrawal.id, wId))
        .limit(1);

      if (!withdrawal) {
        logger.warn({ withdrawalId }, "Withdrawal not found");
        return { success: false, withdrawalId };
      }

      if (withdrawal.status !== "PENDING") {
        logger.info(
          { withdrawalId, status: withdrawal.status },
          "Skipping non-pending"
        );
        return { success: true, withdrawalId };
      }

      const walletAddress = withdrawal.walletAddress as `0x${string}`;
      const amount = Number(withdrawal.amount);

      const balance = await usdcClient.getBalance();
      if (balance < amount) {
        logger.error(
          { withdrawalId, required: amount, available: balance },
          "Insufficient balance"
        );
        throw new Error(
          `Insufficient treasury balance: ${balance} < ${amount}`
        );
      }

      const txHash = await usdcClient.transfer(walletAddress, amount);

      await db
        .update(DB_SCHEMA.withdrawal)
        .set({
          status: "COMPLETED",
          txHash,
          completedAt: new Date(),
          actualAmount: amount.toFixed(2),
        })
        .where(eq(DB_SCHEMA.withdrawal.id, wId));

      if (withdrawal.transactionId) {
        await db
          .update(DB_SCHEMA.transaction)
          .set({ status: "COMPLETED", metadata: { txHash } })
          .where(eq(DB_SCHEMA.transaction.id, withdrawal.transactionId));
      }

      logger.info(
        { withdrawalId, txHash, amount, to: walletAddress },
        "Withdrawal completed"
      );
      return { success: true, withdrawalId, txHash };
    },
    {
      async onFailed(job: ProcessWithdrawalJob, error: Error) {
        const wId = job.withdrawalId as WithdrawalId;
        logger.error(
          { withdrawalId: job.withdrawalId, error: error.message },
          "Withdrawal failed"
        );

        await db
          .update(DB_SCHEMA.withdrawal)
          .set({ status: "FAILED" })
          .where(eq(DB_SCHEMA.withdrawal.id, wId));
      },
    }
  );

  return { close: () => worker.close() };
}
