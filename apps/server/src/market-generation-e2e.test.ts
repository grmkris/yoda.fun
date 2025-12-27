import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createMarketGenerationService,
  getTrendingTopics,
  selectNextCategory,
} from "@yoda.fun/markets/generation";
import { createTestSetup, type TestSetup } from "test/test.setup";

describe("Market Generation E2E", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  }, 60_000);

  afterAll(async () => {
    await testEnv.close();
  });

  test("full pipeline: trending research → distribution → generation", async () => {
    const { db, aiClient, logger } = testEnv.deps;

    // 1. Test trending research
    console.log("\n=== TRENDING RESEARCH ===");
    const topics = await getTrendingTopics({ aiClient, logger });
    console.log("Curated Topics:");
    for (const t of topics.slice(0, 5)) {
      console.log(`  - [${t.category}] ${t.topic}`);
    }

    // 2. Test distribution
    console.log("\n=== CATEGORY DISTRIBUTION ===");
    const category = await selectNextCategory(db);
    console.log(`Selected category: ${category}`);

    // 3. Generate markets
    console.log("\n=== GENERATED MARKETS ===");
    const service = createMarketGenerationService({ db, logger, aiClient });
    const result = await service.generateAndInsertMarkets({
      count: 3,
      categories: [category],
      timeframe: "short",
      curatedTopics: topics,
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
    expect(result.generated.markets[0]?.category).toBe(category);
  }, 180_000);
});
