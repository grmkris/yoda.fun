import { type AiClient, Output } from "@yoda.fun/ai";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { desc } from "@yoda.fun/db/drizzle";
import type { SelectMarket } from "@yoda.fun/db/schema";
import type { Logger } from "@yoda.fun/logger";
import {
  GeneratedMarketsResponseSchema,
  type GenerateMarketsInput,
  type GenerateMarketsResult,
} from "@yoda.fun/shared/market.schema";
import { WORKFLOW_MODELS } from "../config";
import type { DistributionGuidance } from "../prompts";
import { MARKET_PROMPTS } from "../prompts";
import { calculateMarketDates } from "./duration-utils";

// ============================================================================
// Types
// ============================================================================

interface GenerateMarketsInputWithTrending extends GenerateMarketsInput {
  trendingTopics?: string;
  distributionGuidance?: DistributionGuidance;
}

interface GenerateMarketsParams {
  db: Database;
  aiClient: AiClient;
  logger: Logger;
  input: GenerateMarketsInputWithTrending;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 3;

// ============================================================================
// Helpers
// ============================================================================

function buildPrompt(count: number, attempt: number, lastError?: string) {
  if (attempt === 0) {
    return `Generate ${count} prediction markets with PROVOCATIVE angles. Each title must challenge assumptions or create tension - never generic "Will X happen?" format. Frame as debates: "Can X really...?", "Is X about to...?", "Does X still have...?"`;
  }
  return `Generate ${count} prediction markets with provocative angles. Previous attempt failed: ${lastError}. Remember: NO generic "Will X happen?" titles - frame everything as a debate or challenge.`;
}

async function fetchExistingTitles(db: Database): Promise<string[]> {
  const existingMarkets = await db
    .select({ title: DB_SCHEMA.market.title })
    .from(DB_SCHEMA.market)
    .orderBy(desc(DB_SCHEMA.market.createdAt))
    .limit(100);
  return existingMarkets.map((m) => m.title);
}

export async function generateMarkets(
  params: GenerateMarketsParams
): Promise<GenerateMarketsResult> {
  const { db, aiClient, logger, input } = params;

  logger.info(
    {
      count: input.count,
      categories: input.categories,
      hasDistributionGuidance: !!input.distributionGuidance,
      hasTrendingTopics: !!input.trendingTopics,
    },
    "Generating markets with AI"
  );

  const existingTitles = await fetchExistingTitles(db);
  const currentDate = new Date().toISOString().split("T")[0] ?? "";
  const systemPrompt = MARKET_PROMPTS.generation.systemPrompt({
    currentDate,
    categories: input.categories,
    existingMarketTitles: existingTitles,
    targetCount: input.count,
    timeframe: input.timeframe,
    trendingTopics: input.trendingTopics,
    distributionGuidance: input.distributionGuidance,
  });

  const modelConfig = WORKFLOW_MODELS.generation.markets;
  const model = aiClient.getModel(modelConfig);

  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const startTime = Date.now();
      const prompt = buildPrompt(input.count, attempt, lastError);

      const response = await aiClient.generateText({
        model,
        output: Output.object({ schema: GeneratedMarketsResponseSchema }),
        system: systemPrompt,
        prompt,
        temperature: 0.9,
        topP: 0.95,
      });

      const durationMs = Date.now() - startTime;

      logger.info(
        {
          marketsGenerated: response.output.markets.length,
          durationMs,
          tokensUsed: response.usage?.totalTokens ?? 0,
        },
        "Market generation complete"
      );

      return {
        markets: response.output.markets,
        modelVersion: modelConfig.modelId,
        tokensUsed: response.usage?.totalTokens ?? 0,
        durationMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      logger.warn(
        { attempt: attempt + 1, maxRetries: MAX_RETRIES },
        "Generation failed, retrying"
      );

      if (attempt === MAX_RETRIES - 1) {
        logger.error(
          { error: lastError },
          "Generation failed after all retries"
        );
        throw error;
      }
    }
  }

  throw new Error("Generation failed after all retries");
}

export async function generateAndInsertMarkets(
  params: GenerateMarketsParams
): Promise<{
  generated: GenerateMarketsResult;
  inserted: SelectMarket[];
}> {
  const { db, logger, input } = params;

  const generated = await generateMarkets(params);
  const inserted = await db
    .insert(DB_SCHEMA.market)
    .values(
      generated.markets.map((market) => {
        const { votingEndsAt, resolutionDeadline } = calculateMarketDates(
          market.duration
        );
        return {
          title: market.title,
          description: market.description,
          category: market.category,
          resolutionCriteria: market.resolutionCriteria,
          betAmount: market.betAmount,
          votingEndsAt,
          resolutionDeadline,
        };
      })
    )
    .returning();

  logger.info(
    {
      requested: input.count,
      generated: generated.markets.length,
      inserted: inserted.length,
    },
    "Market generation complete"
  );

  return { generated, inserted };
}

// Export types
export type { GenerateMarketsInputWithTrending, GenerateMarketsParams };
