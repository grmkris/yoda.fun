import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq, isNotNull } from "@yoda.fun/db/drizzle";
import type { ERC8004Client } from "@yoda.fun/erc8004";
import { FEEDBACK_TAGS } from "@yoda.fun/erc8004";
import type { Logger } from "@yoda.fun/logger";

export interface ReputationCacheWorkerConfig {
  db: Database;
  logger: Logger;
  erc8004Client: ERC8004Client;
  intervalMs?: number;
}

/**
 * Worker that periodically refreshes the cached reputation scores from on-chain data.
 * Runs on a simple interval rather than a queue job since it's a background task
 * that doesn't need retry logic or priority queuing.
 */
export function createReputationCacheWorker(
  config: ReputationCacheWorkerConfig
): {
  close: () => void;
  refresh: () => Promise<void>;
} {
  const { db, logger, erc8004Client, intervalMs = 5 * 60 * 1000 } = config;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const refresh = async () => {
    try {
      // Get the agent from the database
      const agent = await db.query.agentIdentity.findFirst({
        where: isNotNull(DB_SCHEMA.agentIdentity.id),
      });
      if (!agent) {
        logger.debug({
          msg: "No agent registered, skipping reputation cache refresh",
        });
        return;
      }

      const agentId = BigInt(agent.agentId);

      // Fetch summaries from on-chain
      const [resolutionSummary, qualitySummary] = await Promise.all([
        erc8004Client.getSummary(agentId, FEEDBACK_TAGS.RESOLUTION),
        erc8004Client.getSummary(agentId, FEEDBACK_TAGS.QUALITY),
      ]);

      // Update the cached values in the database
      await db
        .update(DB_SCHEMA.agentIdentity)
        .set({
          cachedResolutionScore: resolutionSummary.averageScore,
          cachedResolutionCount: Number(resolutionSummary.count),
          cachedQualityScore: qualitySummary.averageScore,
          cachedQualityCount: Number(qualitySummary.count),
          lastCacheUpdate: new Date(),
        })
        .where(eq(DB_SCHEMA.agentIdentity.id, agent.id));

      logger.info(
        {
          agentId: agent.agentId,
          resolutionScore: resolutionSummary.averageScore,
          resolutionCount: Number(resolutionSummary.count),
          qualityScore: qualitySummary.averageScore,
          qualityCount: Number(qualitySummary.count),
        },
        "Reputation cache refreshed"
      );
    } catch (error) {
      logger.error({ error }, "Failed to refresh reputation cache");
    }
  };

  // Run immediately on start
  refresh().catch((err) =>
    logger.error({ err }, "Initial reputation cache refresh failed")
  );

  intervalId = setInterval(() => {
    refresh().catch((err) =>
      logger.error({ err }, "Reputation cache refresh failed")
    );
  }, intervalMs);

  logger.info(
    { intervalMs, intervalMinutes: Math.round(intervalMs / 60_000) },
    "Reputation cache worker started"
  );

  return {
    refresh,
    close: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info({ msg: "Reputation cache worker stopped" });
      }
    },
  };
}
