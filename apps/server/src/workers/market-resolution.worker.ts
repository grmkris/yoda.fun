import type { AiClient } from "@yoda.fun/ai";
import { createLeaderboardService } from "@yoda.fun/api/services/leaderboard-service";
import { createPointsService } from "@yoda.fun/api/services/points-service";
import { createRewardService } from "@yoda.fun/api/services/reward-service";
import { createSettlementService } from "@yoda.fun/api/services/settlement-service";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import type { FhevmClient } from "@yoda.fun/fhevm/sdk/server-client";
import { MarketResult } from "@yoda.fun/fhevm/sdk/types";
import type { Logger } from "@yoda.fun/logger";
import { resolveMarket } from "@yoda.fun/markets/resolution";
import type { QueueClient } from "@yoda.fun/queue";
import type { ResolveMarketJob } from "@yoda.fun/queue/jobs/resolve-market-job";

export interface MarketResolutionWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  aiClient: AiClient;
  fhevmClient: FhevmClient;
}

export function createMarketResolutionWorker(
  config: MarketResolutionWorkerConfig
): {
  close: () => Promise<void>;
} {
  const { queue, db, logger, aiClient, fhevmClient } = config;

  const leaderboardService = createLeaderboardService({ deps: { db, logger } });
  const pointsService = createPointsService({ deps: { db, logger } });
  const rewardService = createRewardService({
    deps: { db, pointsService },
  });
  const settlementService = createSettlementService({
    deps: { db, logger, leaderboardService, rewardService },
  });

  logger.info({ msg: "Starting market resolution worker" });

  const worker = queue.createWorker<"resolve-market">(
    "resolve-market",
    async (job: ResolveMarketJob) => {
      const { marketId } = job;

      logger.info({ marketId }, "Processing market resolution job");

      const marketRecords = await db
        .select()
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, marketId))
        .limit(1);

      const market = marketRecords[0];
      if (!market) {
        logger.warn({ marketId }, "Market not found for resolution");
        return { success: false, marketId };
      }

      if (market.result) {
        logger.info({ marketId }, "Market already resolved, skipping");
        return { success: true, marketId };
      }

      await resolveMarket(market, { aiClient, settlementService, logger });

      // Resolve on-chain if market has on-chain ID
      if (market.onChainMarketId) {
        try {
          // Re-read market to get the AI result
          const updatedMarket = await db
            .select({ result: DB_SCHEMA.market.result })
            .from(DB_SCHEMA.market)
            .where(eq(DB_SCHEMA.market.id, marketId))
            .limit(1);

          const marketResult = updatedMarket[0]?.result;
          if (marketResult) {
            const resultMap: Record<string, number> = {
              YES: MarketResult.Yes,
              NO: MarketResult.No,
              INVALID: MarketResult.Invalid,
            };

            const onChainResult = resultMap[marketResult] ?? MarketResult.Invalid;

            await fhevmClient.resolveMarket(
              BigInt(market.onChainMarketId),
              onChainResult
            );

            logger.info(
              {
                marketId,
                onChainMarketId: market.onChainMarketId,
                result: marketResult,
              },
              "Market resolved on-chain"
            );

            // Schedule decrypt-totals job for YES/NO results
            if (marketResult === "YES" || marketResult === "NO") {
              await queue.addJob(
                "decrypt-totals",
                {
                  marketId,
                  onChainMarketId: market.onChainMarketId,
                  attempt: 0,
                },
                { delay: 30_000 }
              );

              logger.info(
                { marketId, onChainMarketId: market.onChainMarketId },
                "Scheduled decrypt-totals job"
              );
            }
          }
        } catch (error) {
          logger.error(
            { marketId, onChainMarketId: market.onChainMarketId, error },
            "Failed to resolve market on-chain"
          );
        }
      }

      return { success: true, marketId };
    },
    {
      onFailed: async (job: ResolveMarketJob, error: Error): Promise<void> => {
        logger.error({
          msg: "Market resolution failed after all retries",
          marketId: job.marketId,
          error: error.message,
        });

        // Persist error to market record
        await db
          .update(DB_SCHEMA.market)
          .set({
            resolutionError: error.message,
            resolutionFailedAt: new Date(),
          })
          .where(eq(DB_SCHEMA.market.id, job.marketId));
      },
    }
  );

  return { close: () => worker.close() };
}
