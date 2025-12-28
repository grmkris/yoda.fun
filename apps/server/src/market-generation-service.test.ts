import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import { generateAndInsertMarkets } from "@yoda.fun/markets/generation";
import { createTestSetup, type TestSetup } from "test/test.setup";

describe("Market Generation Service", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  }, 60_000);

  afterAll(async () => {
    await testEnv.close();
  });

  describe("generateAndInsertMarkets", () => {
    test("generates and inserts markets with correct structure", async () => {
      const { db, aiClient, logger } = testEnv.deps;
      const result = await generateAndInsertMarkets({
        db,
        aiClient,
        logger,
        input: { count: 2, timeframe: "immediate" },
      });

      expect(result.generated.markets.length).toBeGreaterThanOrEqual(1);
      expect(result.generated.modelVersion).toBeTruthy();
      expect(result.generated.durationMs).toBeGreaterThan(0);

      for (const market of result.generated.markets) {
        expect(market.title).toBeTruthy();
        expect(market.description).toBeTruthy();
        expect(market.category).toBeTruthy();
        expect(market.betAmount).toBeTruthy();
        expect(market.duration).toBeDefined();
        expect(market.duration.value).toBeGreaterThan(0);
        expect(["hours", "days", "months"]).toContain(market.duration.unit);
      }

      expect(result.inserted.length).toBeGreaterThanOrEqual(1);
    }, 120_000);

    test("returns model version and token usage", async () => {
      const { db, aiClient, logger } = testEnv.deps;
      const result = await generateAndInsertMarkets({
        db,
        aiClient,
        logger,
        input: { count: 1, timeframe: "immediate" },
      });

      expect(result.generated.modelVersion).toBeTruthy();
      expect(typeof result.generated.durationMs).toBe("number");
    }, 120_000);

    test("inserts markets into database with correct fields", async () => {
      const { db, aiClient, logger } = testEnv.deps;
      const result = await generateAndInsertMarkets({
        db,
        aiClient,
        logger,
        input: { count: 1, timeframe: "immediate" },
      });

      expect(result.inserted.length).toBeGreaterThanOrEqual(1);

      const market = result.inserted[0];
      expect(market).toBeDefined();
      if (market) {
        expect(market.id).toBeTruthy();
        expect(market.title).toBeTruthy();
        expect(market.status).toBe("LIVE");
        expect(market.resolutionType).toBeDefined();
        expect(market.votingEndsAt).toBeInstanceOf(Date);
        expect(market.resolutionDeadline).toBeInstanceOf(Date);
        expect(market.resolutionDeadline.getTime()).toBeGreaterThan(
          market.votingEndsAt.getTime()
        );

        const dbMarket = await testEnv.deps.db
          .select()
          .from(DB_SCHEMA.market)
          .where(eq(DB_SCHEMA.market.id, market.id));

        expect(dbMarket).toHaveLength(1);
      }
    }, 120_000);

    test("calculates resolution buffer correctly", async () => {
      const { db, aiClient, logger } = testEnv.deps;
      const now = Date.now();

      const result = await generateAndInsertMarkets({
        db,
        aiClient,
        logger,
        input: { count: 1, timeframe: "immediate" },
      });

      const market = result.inserted[0];
      expect(market).toBeDefined();
      if (market) {
        const bufferMs =
          market.resolutionDeadline.getTime() - market.votingEndsAt.getTime();
        const expectedBufferMs = 6 * 60 * 60 * 1000;

        expect(bufferMs).toBe(expectedBufferMs);
        expect(market.votingEndsAt.getTime()).toBeGreaterThan(now);
      }
    }, 120_000);
  });
});
