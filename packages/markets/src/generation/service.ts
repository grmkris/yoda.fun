import { type AiClient, Output } from "@yoda.fun/ai";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { desc } from "@yoda.fun/db/drizzle";
import type { SelectMarket } from "@yoda.fun/db/schema";
import type { Logger } from "@yoda.fun/logger";
import {
  type GeneratedMarket,
  GeneratedMarketsResponseSchema,
  type GenerateMarketsInput,
  type GenerateMarketsResult,
} from "@yoda.fun/shared/market.schema";
import { WORKFLOW_MODELS } from "../config";
import type { CuratedTopic, DistributionGuidance } from "../prompts";
import { MARKET_PROMPTS } from "../prompts";
import { type PreparedMarket, prepareMarket } from "./preparer";

/** Extended input with trending topics and distribution guidance */
export interface GenerateMarketsInputWithTrending extends GenerateMarketsInput {
  curatedTopics?: CuratedTopic[];
  distributionGuidance?: DistributionGuidance;
}

interface MarketGenerationServiceDeps {
  db: Database;
  logger: Logger;
  aiClient: AiClient;
}

const MAX_RETRIES = 3;

function buildPrompt(count: number, attempt: number, lastError?: string) {
  if (attempt === 0) {
    return `Generate ${count} unique betting markets based on current events and trends. Focus on engaging, fun topics that will attract bettors.`;
  }
  return `Generate ${count} unique betting markets. Previous attempt failed: ${lastError}. Please try again with valid data.`;
}

export function createMarketGenerationService(
  deps: MarketGenerationServiceDeps
) {
  const { db, logger, aiClient } = deps;

  async function fetchExistingTitles(): Promise<string[]> {
    const existingMarkets = await db
      .select({ title: DB_SCHEMA.market.title })
      .from(DB_SCHEMA.market)
      .orderBy(desc(DB_SCHEMA.market.createdAt))
      .limit(100);
    return existingMarkets.map((m) => m.title);
  }

  function insertToDatabase(
    markets: PreparedMarket[]
  ): Promise<SelectMarket[]> {
    return db.insert(DB_SCHEMA.market).values(markets).returning();
  }

  async function attemptGeneration(
    input: GenerateMarketsInput,
    systemPrompt: string,
    attempt: number,
    lastError?: string
  ): Promise<GenerateMarketsResult> {
    const startTime = Date.now();
    const modelConfig = WORKFLOW_MODELS.generation.markets;
    const model = aiClient.getModel(modelConfig);
    const prompt = buildPrompt(input.count, attempt, lastError);

    const response = await aiClient.generateText({
      model,
      output: Output.object({ schema: GeneratedMarketsResponseSchema }),
      system: systemPrompt,
      prompt,
      // Creative settings for more varied/spicy titles
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
  }

  const generateMarkets = async (
    input: GenerateMarketsInputWithTrending
  ): Promise<GenerateMarketsResult> => {
    logger.info(
      {
        count: input.count,
        categories: input.categories,
        hasDistributionGuidance: !!input.distributionGuidance,
        hasCuratedTopics: !!input.curatedTopics?.length,
      },
      "Generating markets with AI"
    );

    const existingTitles = await fetchExistingTitles();
    const currentDate = new Date().toISOString().split("T")[0] ?? "";
    const systemPrompt = MARKET_PROMPTS.generation.systemPrompt({
      currentDate,
      categories: input.categories,
      existingMarketTitles: existingTitles,
      targetCount: input.count,
      timeframe: input.timeframe,
      curatedTopics: input.curatedTopics,
      distributionGuidance: input.distributionGuidance,
    });

    let lastError: string | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await attemptGeneration(input, systemPrompt, attempt, lastError);
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
  };

  const insertMarkets = (
    markets: GeneratedMarket[]
  ): Promise<SelectMarket[]> => {
    const prepared = markets.map((m) => prepareMarket(m, null));
    return insertToDatabase(prepared);
  };

  return {
    async generateAndInsertMarkets(
      input: GenerateMarketsInputWithTrending
    ): Promise<{
      generated: GenerateMarketsResult;
      inserted: SelectMarket[];
    }> {
      const generated = await generateMarkets(input);
      const inserted = await insertMarkets(generated.markets);

      logger.info(
        {
          requested: input.count,
          generated: generated.markets.length,
          inserted: inserted.length,
        },
        "Market generation complete"
      );

      return { generated, inserted };
    },
  };
}

export type MarketGenerationService = ReturnType<
  typeof createMarketGenerationService
>;
