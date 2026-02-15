import type { Database } from "@yoda.fun/db";
import type { FhevmClient } from "@yoda.fun/fhevm/sdk/server-client";
import type { Logger } from "@yoda.fun/logger";
import type { QueueClient } from "@yoda.fun/queue";
import type { DecryptTotalsJob } from "@yoda.fun/queue/jobs/decrypt-totals-job";

const MAX_ATTEMPTS = 20; // 20 * 30s = 10 min
const RETRY_DELAY_MS = 30_000;

export interface DecryptTotalsWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  fhevmClient: FhevmClient;
}

export function createDecryptTotalsWorker(config: DecryptTotalsWorkerConfig): {
  close: () => Promise<void>;
} {
  const { queue, db, logger, fhevmClient } = config;

  logger.info({ msg: "Starting decrypt totals worker" });

  const worker = queue.createWorker<"decrypt-totals">(
    "decrypt-totals",
    async (job: DecryptTotalsJob) => {
      const { marketId, onChainMarketId, attempt } = job;

      logger.info(
        { marketId, onChainMarketId, attempt },
        "Checking decrypted totals"
      );

      // Read on-chain market state
      const onChainMarket = await fhevmClient.getMarket(
        BigInt(onChainMarketId)
      );

      if (onChainMarket.totalsDecrypted) {
        // Totals are ready — submit them on-chain
        const txHash = await fhevmClient.setDecryptedTotals(
          BigInt(onChainMarketId),
          onChainMarket.decryptedYesTotal,
          onChainMarket.decryptedNoTotal
        );

        logger.info(
          {
            marketId,
            onChainMarketId,
            yesTotal: onChainMarket.decryptedYesTotal.toString(),
            noTotal: onChainMarket.decryptedNoTotal.toString(),
            txHash,
          },
          "Decrypted totals submitted on-chain"
        );

        return {
          success: true,
          marketId,
          yesTotal: onChainMarket.decryptedYesTotal,
          noTotal: onChainMarket.decryptedNoTotal,
        };
      }

      // Not yet decrypted — retry if under max attempts
      if (attempt >= MAX_ATTEMPTS) {
        logger.warn(
          { marketId, onChainMarketId, attempt },
          "Max decrypt attempts reached, giving up"
        );
        return { success: false, marketId };
      }

      // Re-queue with incremented attempt
      await queue.addJob(
        "decrypt-totals",
        {
          marketId,
          onChainMarketId,
          attempt: attempt + 1,
        },
        { delay: RETRY_DELAY_MS }
      );

      logger.info(
        { marketId, onChainMarketId, nextAttempt: attempt + 1 },
        "Totals not yet decrypted, retrying"
      );

      return { success: false, marketId };
    },
    {
      onFailed: async (job: DecryptTotalsJob, error: Error) => {
        logger.error(
          {
            marketId: job.marketId,
            onChainMarketId: job.onChainMarketId,
            error: error.message,
          },
          "Decrypt totals job failed"
        );
      },
    }
  );

  return { close: () => worker.close() };
}
