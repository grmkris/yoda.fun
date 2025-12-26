import type { AiClient } from "@yoda.fun/ai";
import { createLeaderboardService } from "@yoda.fun/api/services/leaderboard-service";
import { createSettlementService } from "@yoda.fun/api/services/settlement-service";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import { resolveMarket } from "@yoda.fun/markets/resolution";
import type { QueueClient } from "@yoda.fun/queue";
import type { ResolveMarketJob } from "@yoda.fun/queue/jobs/resolve-market-job";

export interface MarketResolutionWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  aiClient: AiClient;
}

export function createMarketResolutionWorker(
  config: MarketResolutionWorkerConfig
): {
  close: () => Promise<void>;
} {
  const { queue, db, logger, aiClient } = config;

  const leaderboardService = createLeaderboardService({ deps: { db, logger } });
  const settlementService = createSettlementService({
    deps: { db, logger, leaderboardService },
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

      return { success: true, marketId };
    },
    {
      onFailed: (job: ResolveMarketJob, error: Error): Promise<void> => {
        logger.error({
          msg: "Market resolution failed after all retries",
          marketId: job.marketId,
          error: error.message,
        });
        return Promise.resolve();
      },
    }
  );

  return { close: () => worker.close() };
}
