import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  generateAndInsertMarkets,
  getTrendingTopics,
} from "@yoda.fun/markets/generation";
import { DEFAULT_TOPICS } from "@yoda.fun/shared/market.schema";
import { createTestSetup, type TestSetup } from "test/test.setup";

const pickRandomFromArray = <T>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

describe("Market Generation E2E", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  }, 60_000);

  afterAll(async () => {
    await testEnv.close();
  });

  test("full pipeline: trending research → generation", async () => {
    const { db, aiClient, logger } = testEnv.deps;

    // 1. Pick random categories to research
    console.log("\n=== TRENDING RESEARCH ===");
    const topics = pickRandomFromArray(DEFAULT_TOPICS, 4);
    console.log(
      "Researching categories:",
      topics.map((t) => t.category)
    );

    // 2. Fetch fresh trending topics
    const trendingTopics = await getTrendingTopics({
      aiClient,
      logger,
      config: { topics },
    });
    console.log("Trending Topics:", trendingTopics.slice(0, 500));

    // 3. Generate markets from trending topics
    console.log("\n=== GENERATED MARKETS ===");
    const result = await generateAndInsertMarkets({
      db,
      aiClient,
      logger,
      input: {
        count: 3,
        timeframe: "short",
        trendingTopics,
      },
    });

    for (const market of result.generated.markets) {
      console.log(`\n  Title: ${market.title}`);
      console.log(`  Category: ${market.category}`);
      console.log(`  Description: ${market.description}`);
      console.log(
        `  Duration: ${market.duration.value} ${market.duration.unit}`
      );
      console.log(`  Resolution: ${market.resolutionCriteria}`);
    }

    expect(result.generated.markets.length).toBeGreaterThan(0);
  }, 180_000);
});
