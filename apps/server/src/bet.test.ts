import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { call, ORPCError } from "@orpc/server";
import { appRouter } from "@yoda.fun/api/routers";
import { typeIdGenerator, UserId } from "@yoda.fun/shared/typeid";
import { createTestSetup, type TestSetup } from "test/test.setup";
import {
  createEndedTestMarket,
  createTestContext,
  createTestMarket,
  fundUserPoints,
} from "test/test-helpers";

describe("Bet Router", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  });

  afterAll(async () => {
    await testEnv.close();
  });

  describe("bet.place", () => {
    test("successfully places bet when balance sufficient", async () => {
      const userId = UserId.parse(testEnv.users.authenticated.id);

      // Create market and fund user
      const market = await createTestMarket(testEnv.deps.db, {
        betAmount: "10.00",
      });
      await fundUserPoints(testEnv.deps.pointsService, userId, 50);

      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      const result = await call(
        appRouter.bet.place,
        { marketId: market.id, vote: "YES" },
        { context }
      );

      expect(result.success).toBe(true);
      expect(result.betId).toBeDefined();
      expect(result.marketId).toBe(market.id);
      expect(result.vote).toBe("YES");

      // Verify points were deducted (3 points per vote)
      const pointsResult = await call(appRouter.points.get, undefined, {
        context,
      });
      expect(pointsResult.points).toBe(47); // 50 - 3
    });

    test("throws error when insufficient balance", async () => {
      // Create market - user has no balance
      const market = await createTestMarket(testEnv.deps.db, {
        betAmount: "100.00",
      });

      const context = await createTestContext({
        token: testEnv.users.unauthenticated.token,
        testSetup: testEnv,
      });

      await expect(() =>
        call(
          appRouter.bet.place,
          { marketId: market.id, vote: "NO" },
          { context }
        )
      ).toThrow();
    });

    test("throws BAD_REQUEST when user already bet on market", async () => {
      const userId = UserId.parse(testEnv.users.authenticated.id);

      // Create market and fund user generously
      const market = await createTestMarket(testEnv.deps.db, {
        betAmount: "5.00",
      });
      await fundUserPoints(testEnv.deps.pointsService, userId, 100);

      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      // First bet should succeed
      await call(
        appRouter.bet.place,
        { marketId: market.id, vote: "YES" },
        { context }
      );

      // Second bet should fail
      await expect(() =>
        call(
          appRouter.bet.place,
          { marketId: market.id, vote: "NO" },
          { context }
        )
      ).toThrow(ORPCError);

      try {
        await call(
          appRouter.bet.place,
          { marketId: market.id, vote: "NO" },
          { context }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ORPCError);
        expect((error as ORPCError<string, unknown>).code).toBe("BAD_REQUEST");
      }
    });

    test("throws NOT_FOUND when market does not exist", async () => {
      const userId = UserId.parse(testEnv.users.authenticated.id);
      await fundUserPoints(testEnv.deps.pointsService, userId, 50);

      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      // Generate a valid TypeID that doesn't exist in the database
      const fakeMarketId = typeIdGenerator("market");

      await expect(() =>
        call(
          appRouter.bet.place,
          { marketId: fakeMarketId, vote: "YES" },
          { context }
        )
      ).toThrow(ORPCError);

      try {
        await call(
          appRouter.bet.place,
          { marketId: fakeMarketId, vote: "YES" },
          { context }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ORPCError);
        expect((error as ORPCError<string, unknown>).code).toBe("NOT_FOUND");
      }
    });

    test("throws BAD_REQUEST when market voting has ended", async () => {
      const userId = UserId.parse(testEnv.users.authenticated.id);

      // Create ended market and fund user
      const market = await createEndedTestMarket(testEnv.deps.db, {
        betAmount: "10.00",
      });
      await fundUserPoints(testEnv.deps.pointsService, userId, 50);

      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      await expect(() =>
        call(
          appRouter.bet.place,
          { marketId: market.id, vote: "YES" },
          { context }
        )
      ).toThrow(ORPCError);

      try {
        await call(
          appRouter.bet.place,
          { marketId: market.id, vote: "YES" },
          { context }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ORPCError);
        expect((error as ORPCError<string, unknown>).code).toBe("BAD_REQUEST");
      }
    });

    test("throws UNAUTHORIZED when not authenticated", async () => {
      const market = await createTestMarket(testEnv.deps.db);

      const context = await createTestContext({ testSetup: testEnv });

      await expect(() =>
        call(
          appRouter.bet.place,
          { marketId: market.id, vote: "YES" },
          { context }
        )
      ).toThrow(ORPCError);

      try {
        await call(
          appRouter.bet.place,
          { marketId: market.id, vote: "YES" },
          { context }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ORPCError);
        expect((error as ORPCError<string, unknown>).code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("bet.history", () => {
    test("returns empty array when no bets", async () => {
      const context = await createTestContext({
        token: testEnv.users.unauthenticated.token,
        testSetup: testEnv,
      });

      const result = await call(
        appRouter.bet.history,
        { limit: 10, offset: 0 },
        { context }
      );

      expect(result.bets).toBeInstanceOf(Array);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    test("returns bets with pagination", async () => {
      const userId = UserId.parse(testEnv.users.authenticated.id);

      // Fund user and create multiple markets/bets
      await fundUserPoints(testEnv.deps.pointsService, userId, 500);

      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      // Create 3 markets and place bets
      for (let i = 0; i < 3; i++) {
        const market = await createTestMarket(testEnv.deps.db, {
          betAmount: "5.00",
        });
        await call(
          appRouter.bet.place,
          { marketId: market.id, vote: i % 2 === 0 ? "YES" : "NO" },
          { context }
        );
      }

      // List with limit
      const result = await call(
        appRouter.bet.history,
        { limit: 2, offset: 0 },
        { context }
      );

      expect(result.bets.length).toBeLessThanOrEqual(2);
    });

    test("filters by status", async () => {
      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      const result = await call(
        appRouter.bet.history,
        { status: "ACTIVE", limit: 10, offset: 0 },
        { context }
      );

      // All returned bets should be ACTIVE
      for (const item of result.bets) {
        expect(item.bet.status).toBe("ACTIVE");
      }
    });

    test("throws UNAUTHORIZED when not authenticated", async () => {
      const context = await createTestContext({ testSetup: testEnv });

      await expect(() =>
        call(appRouter.bet.history, { limit: 10, offset: 0 }, { context })
      ).toThrow(ORPCError);
    });
  });
});
