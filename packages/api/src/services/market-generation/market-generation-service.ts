import { type AiClient, Output } from "@yoda.fun/ai";
import { FEATURES } from "@yoda.fun/ai/ai-config";
import { generateMarketImages } from "@yoda.fun/ai/image-generation";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { desc } from "@yoda.fun/db/drizzle";
import type { SelectMarket } from "@yoda.fun/db/schema";
import type { Logger } from "@yoda.fun/logger";
import type { StorageClient } from "@yoda.fun/storage";
import {
  type GeneratedMarket,
  GeneratedMarketsResponseSchema,
  type GenerateMarketsInput,
  type GenerateMarketsResult,
} from "../market-generation-schemas";
import { type PreparedMarket, prepareMarket } from "./market-preparer";

interface MarketGenerationServiceDeps {
  db: Database;
  logger: Logger;
  aiClient: AiClient;
  storage?: StorageClient;
}

export function createMarketGenerationService(
  deps: MarketGenerationServiceDeps
) {
  const { db, logger, aiClient, storage } = deps;

  async function generateImages(
    markets: GeneratedMarket[]
  ): Promise<Map<string, string | null>> {
    if (!storage) {
      return new Map();
    }

    const googleApiKey = aiClient.getProviderConfig().googleGeminiApiKey;
    if (!googleApiKey) {
      return new Map();
    }

    logger.info({ count: markets.length }, "Generating market images");
    try {
      const imageUrls = await generateMarketImages(markets, {
        googleApiKey,
        storage,
      });
      logger.info(
        { generated: [...imageUrls.values()].filter(Boolean).length },
        "Market images generated"
      );
      return imageUrls;
    } catch (error) {
      logger.error({ error }, "Failed to generate market images");
      return new Map();
    }
  }

  async function insertToDatabase(
    markets: PreparedMarket[]
  ): Promise<SelectMarket[]> {
    const result = await db
      .insert(DB_SCHEMA.market)
      .values(markets)
      .returning();

    return result;
  }

  return {
    async generateMarkets(
      input: GenerateMarketsInput
    ): Promise<GenerateMarketsResult> {
      const startTime = Date.now();
      const config = FEATURES.marketGeneration;

      logger.info(
        { count: input.count, categories: input.categories },
        "Generating markets with AI"
      );

      const existingMarkets = await db
        .select({ title: DB_SCHEMA.market.title })
        .from(DB_SCHEMA.market)
        .orderBy(desc(DB_SCHEMA.market.createdAt))
        .limit(50);

      const existingTitles = existingMarkets.map((m) => m.title);

      const promptContext = {
        currentDate: new Date().toISOString().split("T")[0] ?? "",
        categories: input.categories,
        existingMarketTitles: existingTitles,
        targetCount: input.count,
      };

      const systemPrompt = config.systemPrompt(promptContext);
      const model = aiClient.getModel(config.model);

      const response = await aiClient.generateText({
        model,
        output: Output.object({ schema: GeneratedMarketsResponseSchema }),
        system: systemPrompt,
        prompt: `Generate ${input.count} unique betting markets based on current events and trends. Focus on engaging, fun topics that will attract bettors.`,
      });

      const durationMs = Date.now() - startTime;

      logger.info(
        {
          marketsGenerated: response.output.markets.length,
          durationMs,
          tokensUsed: response.usage?.totalTokens,
        },
        "Markets generated successfully"
      );

      return {
        markets: response.output.markets,
        modelVersion: config.model.modelId,
        tokensUsed: response.usage?.totalTokens,
        durationMs,
      };
    },

    async insertMarkets(markets: GeneratedMarket[]): Promise<SelectMarket[]> {
      const imageUrls = await generateImages(markets);
      const prepared = await Promise.all(
        markets.map((market) =>
          prepareMarket({
            market,
            imageUrl: imageUrls.get(market.title),
            logger,
          })
        )
      );
      return insertToDatabase(prepared);
    },

    async generateAndInsertMarkets(input: GenerateMarketsInput): Promise<{
      generated: GenerateMarketsResult;
      inserted: SelectMarket[];
    }> {
      const generated = await this.generateMarkets(input);
      const inserted = await this.insertMarkets(generated.markets);

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
