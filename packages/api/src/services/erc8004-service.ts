import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, desc, eq } from "@yoda.fun/db/drizzle";
import type { ERC8004Client } from "@yoda.fun/erc8004";
import { FEEDBACK_TAGS } from "@yoda.fun/erc8004";
import type { Logger } from "@yoda.fun/logger";
import type { MarketId, UserId } from "@yoda.fun/shared/typeid";

export type FeedbackType = "RESOLUTION" | "QUALITY";

export interface AgentProfile {
  agentId: number;
  ownerAddress: string;
  name: string;
  description: string | null;
  tokenUri: string | null;
  chainId: number;
  resolutionScore: number | null;
  resolutionCount: number;
  qualityScore: number | null;
  qualityCount: number;
  lastCacheUpdate: Date | null;
}

export interface FeedbackAuthResult {
  auth: string;
  agentId: number;
  expiry: number;
  indexLimit: number;
}

interface ERC8004ServiceDeps {
  db: Database;
  logger: Logger;
  erc8004Client: ERC8004Client;
}

export function createERC8004Service({ deps }: { deps: ERC8004ServiceDeps }) {
  const { db, logger, erc8004Client } = deps;

  return {
    /**
     * Get the Yoda agent profile with cached reputation scores
     */
    async getAgentProfile(): Promise<AgentProfile | null> {
      const agents = await db.select().from(DB_SCHEMA.agentIdentity).limit(1);

      const agent = agents[0];
      if (!agent) {
        return null;
      }

      return {
        agentId: agent.agentId,
        ownerAddress: agent.ownerAddress,
        name: agent.name,
        description: agent.description,
        tokenUri: agent.tokenUri,
        chainId: agent.chainId,
        resolutionScore: agent.cachedResolutionScore,
        resolutionCount: agent.cachedResolutionCount ?? 0,
        qualityScore: agent.cachedQualityScore,
        qualityCount: agent.cachedQualityCount ?? 0,
        lastCacheUpdate: agent.lastCacheUpdate,
      };
    },

    /**
     * Generate feedbackAuth signature for a user to submit feedback on-chain
     */
    async generateFeedbackAuth(
      userId: UserId,
      marketId: MarketId,
      feedbackType: FeedbackType
    ): Promise<FeedbackAuthResult> {
      if (!erc8004Client) {
        throw new Error("ERC-8004 client not configured");
      }

      // Get user's wallet address
      const wallets = await db
        .select()
        .from(DB_SCHEMA.walletAddress)
        .where(eq(DB_SCHEMA.walletAddress.userId, userId))
        .limit(1);

      const wallet = wallets[0];
      if (!wallet) {
        throw new Error("User has no wallet connected");
      }

      // Get agent
      const agents = await db.select().from(DB_SCHEMA.agentIdentity).limit(1);

      const agent = agents[0];
      if (!agent) {
        throw new Error("Agent not registered");
      }

      // Get current feedback index for this user-agent pair
      const lastIndex = await erc8004Client.getLastIndex(
        BigInt(agent.agentId),
        wallet.address as `0x${string}`
      );

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour
      const indexLimit = lastIndex + BigInt(1);

      const result = await erc8004Client.generateFeedbackAuth({
        agentId: BigInt(agent.agentId),
        clientAddress: wallet.address as `0x${string}`,
        indexLimit,
        expiry,
      });

      // Create pending feedback record
      await db
        .insert(DB_SCHEMA.agentFeedback)
        .values({
          userId,
          marketId,
          agentId: agent.agentId,
          feedbackType,
          score: 0, // Will be set when user submits
          status: "PENDING_AUTH",
        })
        .onConflictDoNothing();

      logger.debug(
        {
          userId,
          marketId,
          feedbackType,
          agentId: agent.agentId,
          indexLimit: indexLimit.toString(),
        },
        "Generated feedbackAuth"
      );

      return {
        auth: result.auth,
        agentId: agent.agentId,
        expiry: Number(expiry),
        indexLimit: Number(indexLimit),
      };
    },

    /**
     * Record feedback after user submits on-chain transaction
     */
    async recordFeedback(
      userId: UserId,
      marketId: MarketId,
      feedbackType: FeedbackType,
      score: number,
      txHash: string,
      onChainIndex?: number
    ): Promise<void> {
      await db
        .update(DB_SCHEMA.agentFeedback)
        .set({
          score,
          txHash,
          onChainIndex,
          status: "SUBMITTED",
        })
        .where(
          and(
            eq(DB_SCHEMA.agentFeedback.userId, userId),
            eq(DB_SCHEMA.agentFeedback.marketId, marketId),
            eq(DB_SCHEMA.agentFeedback.feedbackType, feedbackType)
          )
        );

      logger.info(
        { userId, marketId, feedbackType, score, txHash },
        "Recorded feedback submission"
      );
    },

    /**
     * Refresh cached reputation scores from chain
     */
    async refreshReputationCache(): Promise<void> {
      if (!erc8004Client) {
        logger.warn({
          message: "ERC-8004 client not configured, skipping cache refresh",
        });
        return;
      }

      const agents = await db.select().from(DB_SCHEMA.agentIdentity).limit(1);

      const agent = agents[0];
      if (!agent) {
        return;
      }

      const agentId = BigInt(agent.agentId);

      const [resolutionSummary, qualitySummary] = await Promise.all([
        erc8004Client.getSummary(agentId, FEEDBACK_TAGS.RESOLUTION),
        erc8004Client.getSummary(agentId, FEEDBACK_TAGS.QUALITY),
      ]);

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
        "Refreshed reputation cache"
      );
    },

    /**
     * Get user's feedback for a specific market
     */
    async getUserFeedback(userId: UserId, marketId: MarketId) {
      const feedback = await db
        .select()
        .from(DB_SCHEMA.agentFeedback)
        .where(
          and(
            eq(DB_SCHEMA.agentFeedback.userId, userId),
            eq(DB_SCHEMA.agentFeedback.marketId, marketId)
          )
        );

      return feedback;
    },

    /**
     * Get recent feedback history
     */
    async getRecentFeedback(limit = 20) {
      const feedback = await db
        .select({
          feedback: DB_SCHEMA.agentFeedback,
          market: {
            id: DB_SCHEMA.market.id,
            title: DB_SCHEMA.market.title,
          },
          user: {
            id: DB_SCHEMA.user.id,
            username: DB_SCHEMA.user.username,
            displayUsername: DB_SCHEMA.user.displayUsername,
          },
        })
        .from(DB_SCHEMA.agentFeedback)
        .innerJoin(
          DB_SCHEMA.market,
          eq(DB_SCHEMA.agentFeedback.marketId, DB_SCHEMA.market.id)
        )
        .innerJoin(
          DB_SCHEMA.user,
          eq(DB_SCHEMA.agentFeedback.userId, DB_SCHEMA.user.id)
        )
        .where(eq(DB_SCHEMA.agentFeedback.status, "SUBMITTED"))
        .orderBy(desc(DB_SCHEMA.agentFeedback.createdAt))
        .limit(limit);

      return feedback;
    },

    /**
     * Check if user can give feedback for a market
     */
    async canGiveFeedback(
      userId: UserId,
      marketId: MarketId,
      feedbackType: FeedbackType
    ): Promise<{ canGive: boolean; reason?: string }> {
      // Check if user already gave this type of feedback
      const existing = await db
        .select()
        .from(DB_SCHEMA.agentFeedback)
        .where(
          and(
            eq(DB_SCHEMA.agentFeedback.userId, userId),
            eq(DB_SCHEMA.agentFeedback.marketId, marketId),
            eq(DB_SCHEMA.agentFeedback.feedbackType, feedbackType)
          )
        )
        .limit(1);

      if (existing.length > 0 && existing[0]?.status === "SUBMITTED") {
        return { canGive: false, reason: "Already submitted feedback" };
      }

      // For RESOLUTION feedback, check if market is settled and user participated
      if (feedbackType === "RESOLUTION") {
        const markets = await db
          .select()
          .from(DB_SCHEMA.market)
          .where(eq(DB_SCHEMA.market.id, marketId))
          .limit(1);

        if (!markets[0] || markets[0].status !== "SETTLED") {
          return { canGive: false, reason: "Market not yet settled" };
        }

        // Check if user placed a bet
        const bets = await db
          .select()
          .from(DB_SCHEMA.bet)
          .where(
            and(
              eq(DB_SCHEMA.bet.userId, userId),
              eq(DB_SCHEMA.bet.marketId, marketId)
            )
          )
          .limit(1);

        if (bets.length === 0) {
          return {
            canGive: false,
            reason: "User did not participate in market",
          };
        }
      }

      // For QUALITY feedback, check if user placed a bet
      if (feedbackType === "QUALITY") {
        const bets = await db
          .select()
          .from(DB_SCHEMA.bet)
          .where(
            and(
              eq(DB_SCHEMA.bet.userId, userId),
              eq(DB_SCHEMA.bet.marketId, marketId)
            )
          )
          .limit(1);

        if (bets.length === 0) {
          return { canGive: false, reason: "User did not place a bet" };
        }
      }

      return { canGive: true };
    },
  };
}

export type ERC8004Service = ReturnType<typeof createERC8004Service>;
