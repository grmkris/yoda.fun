import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createMarketGenerationService } from "@yoda.fun/api/services/market-generation/market-generation-service";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import { createTestSetup, type TestSetup } from "test/test.setup";

describe("Market Generation Service", () => {
  let testEnv: TestSetup;
  let marketGenerationService: ReturnType<typeof createMarketGenerationService>;

  beforeAll(async () => {
    testEnv = await createTestSetup();

    marketGenerationService = createMarketGenerationService({
      db: testEnv.deps.db,
      logger: testEnv.deps.logger,
      aiClient: testEnv.deps.aiClient,
      storage: testEnv.deps.storage,
    });
  }, 60_000);

  afterAll(async () => {
    await testEnv.close();
  });

  describe("generateMarkets", () => {
    test("generates requested number of markets with real AI", async () => {
      const result = await marketGenerationService.generateMarkets({
        count: 2,
      });

      expect(result.markets.length).toBeGreaterThanOrEqual(1);
      expect(result.modelVersion).toBeTruthy();
      expect(result.durationMs).toBeGreaterThan(0);

      // Each market should have required fields
      for (const market of result.markets) {
        expect(market.title).toBeTruthy();
        expect(market.description).toBeTruthy();
        expect(market.category).toBeTruthy();
        expect(market.betAmount).toBeTruthy();
        expect(market.duration).toBeDefined();
        expect(market.duration.value).toBeGreaterThan(0);
        expect(["hours", "days", "months"]).toContain(market.duration.unit);
        expect(market.resolutionMethod).toBeDefined();
        expect(market.resolutionMethod.type).toBeTruthy();
      }
    }, 90_000);

    test("returns model version and token usage", async () => {
      const result = await marketGenerationService.generateMarkets({
        count: 1,
      });

      expect(result.modelVersion).toBeTruthy();
      expect(typeof result.durationMs).toBe("number");
    }, 90_000);
  });

  describe("insertMarkets", () => {
    test("inserts markets into database with correct fields", async () => {
      const inserted = await marketGenerationService.insertMarkets([
        {
          title: `Test market insert ${Date.now()}`,
          description: "Test description",
          category: "other",
          betAmount: "1.00",
          duration: { value: 24, unit: "hours" as const },
          resolutionMethod: {
            type: "WEB_SEARCH" as const,
            searchQuery: "test search query",
            successIndicators: ["success"],
          },
          resolutionCriteria: "Test criteria",
        },
      ]);

      expect(inserted).toHaveLength(1);

      const market = inserted[0];
      expect(market).toBeDefined();
      if (market) {
        expect(market.id).toBeTruthy();
        expect(market.title).toBe(`Test market insert ${Date.now()}`);
        expect(market.status).toBe("ACTIVE");
        expect(market.resolutionType).toBeDefined();
        expect(market.votingEndsAt).toBeInstanceOf(Date);
        expect(market.resolutionDeadline).toBeInstanceOf(Date);

        // Resolution deadline should be after voting ends
        expect(market.resolutionDeadline.getTime()).toBeGreaterThan(
          market.votingEndsAt.getTime()
        );
      }
    }, 30_000);

    test("calculates votingEndsAt and resolution buffer correctly", async () => {
      const now = Date.now();

      const inserted = await marketGenerationService.insertMarkets([
        {
          title: `Test market timing ${Date.now()}`,
          description: "Test description",
          category: "other",
          betAmount: "1.00",
          duration: { value: 24, unit: "hours" as const },
          resolutionMethod: {
            type: "WEB_SEARCH" as const,
            searchQuery: "test timing query",
            successIndicators: ["success"],
          },
          resolutionCriteria: "Test criteria",
        },
      ]);

      const market = inserted[0];
      expect(market).toBeDefined();
      if (market) {
        // Should be ~24 hours from now
        const expectedEnd = now + 24 * 60 * 60 * 1000;
        const actualEnd = market.votingEndsAt.getTime();

        // Allow 10 second tolerance
        expect(Math.abs(actualEnd - expectedEnd)).toBeLessThan(10_000);

        // Buffer should be 6 hours
        const bufferMs =
          market.resolutionDeadline.getTime() - market.votingEndsAt.getTime();
        const expectedBufferMs = 6 * 60 * 60 * 1000;

        expect(bufferMs).toBe(expectedBufferMs);
      }
    }, 30_000);
  });

  describe("generateAndInsertMarkets", () => {
    test("generates and inserts markets end-to-end", async () => {
      const result = await marketGenerationService.generateAndInsertMarkets({
        count: 1,
      });

      expect(result.generated.markets.length).toBeGreaterThanOrEqual(1);
      expect(result.inserted.length).toBeGreaterThanOrEqual(1);

      // Verify inserted in DB
      const market = result.inserted[0];
      if (market) {
        const dbMarket = await testEnv.deps.db
          .select()
          .from(DB_SCHEMA.market)
          .where(eq(DB_SCHEMA.market.id, market.id));

        expect(dbMarket).toHaveLength(1);
      }
    }, 120_000);
  });
});
