import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { call, ORPCError } from "@orpc/server";
import { appRouter } from "@yoda.fun/api/routers";
import { createTestSetup, type TestSetup } from "test/test.setup";
import { createTestContext, createTestMarket } from "test/test-helpers";

const marketRouter = appRouter.market;
describe("App Router (oRPC)", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  });

  afterAll(async () => {
    await testEnv.close();
  });

  describe("Health Check", () => {
    test("returns OK for public endpoint", async () => {
      const context = await createTestContext({ testSetup: testEnv });

      const result = await call(appRouter.healthCheck, undefined, {
        context,
      });

      expect(result).toBe("OK");
    });
  });
});

describe("Market Router", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  });

  afterAll(async () => {
    await testEnv.close();
  });

  describe("list", () => {
    test("returns empty array when no markets exist", async () => {
      const context = await createTestContext({ testSetup: testEnv });

      const result = await call(
        marketRouter.list,
        { limit: 10, offset: 0 },
        { context }
      );

      expect(result.markets).toEqual([]);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    test("returns markets with pagination", async () => {
      const context = await createTestContext({ testSetup: testEnv });
      await createTestMarket(testEnv.deps.db);

      const result = await call(
        marketRouter.list,
        { limit: 10, offset: 0 },
        { context }
      );

      expect(result.markets.length).toBeGreaterThan(0);
    });

    test("filters by status", async () => {
      const context = await createTestContext({ testSetup: testEnv });

      const result = await call(
        marketRouter.list,
        { status: "LIVE", limit: 10, offset: 0 },
        { context }
      );

      expect(result.markets).toBeDefined();
    });
  });

  describe("get", () => {
    test("returns market by id", async () => {
      const context = await createTestContext({ testSetup: testEnv });
      const market = await createTestMarket(testEnv.deps.db);

      const result = await call(
        marketRouter.get,
        { marketId: market.id },
        { context }
      );

      expect(result.id).toBe(market.id);
      expect(result.title).toBe(market.title);
    });

    test("throws NOT_FOUND for non-existent market", async () => {
      const context = await createTestContext({ testSetup: testEnv });

      await expect(
        call(
          marketRouter.get,
          { marketId: "mkt_nonexistent123456789012" },
          { context }
        )
      ).rejects.toThrow();
    });
  });

  describe("getStack (protected)", () => {
    test("returns stack for authenticated user", async () => {
      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });
      await createTestMarket(testEnv.deps.db);

      const result = await call(
        marketRouter.getStack,
        { limit: 5 },
        { context }
      );

      expect(result.markets).toBeDefined();
    });

    test("throws UNAUTHORIZED when not authenticated", async () => {
      const context = await createTestContext({ testSetup: testEnv });

      await expect(
        call(marketRouter.getStack, { limit: 5 }, { context })
      ).rejects.toThrow(ORPCError);
    });
  });
});
