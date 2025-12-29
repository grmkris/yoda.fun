import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createSettlementService } from "@yoda.fun/api/services/settlement-service";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import { typeIdGenerator, UserId } from "@yoda.fun/shared/typeid";
import { createTestSetup, type TestSetup } from "test/test.setup";
import {
  createEndedTestMarket,
  createTestBet,
  createTestMarket,
  fundUserPoints,
} from "test/test-helpers";

describe("Settlement Service", () => {
  let testEnv: TestSetup;
  let settlementService: ReturnType<typeof createSettlementService>;

  beforeAll(async () => {
    testEnv = await createTestSetup();
    settlementService = createSettlementService({
      deps: {
        db: testEnv.deps.db,
        logger: testEnv.deps.logger,
      },
    });
  });

  afterAll(async () => {
    await testEnv.close();
  });

  describe("resolveMarket", () => {
    test("resolves market with YES result", async () => {
      const market = await createTestMarket(testEnv.deps.db);

      const result = await settlementService.resolveMarket(market.id, "YES", {
        confidence: 95,
      });

      expect(result.marketId).toBe(market.id);
      expect(result.result).toBe("YES");

      // Verify market was updated
      const updatedMarkets = await testEnv.deps.db
        .select()
        .from(DB_SCHEMA.market)
        .where(eq(DB_SCHEMA.market.id, market.id));

      expect(updatedMarkets[0]?.result).toBe("YES");
      expect(updatedMarkets[0]?.status).toBe("SETTLED");
      expect(updatedMarkets[0]?.resolutionConfidence).toBe(95);
    });

    test("throws error when market already resolved", async () => {
      const market = await createTestMarket(testEnv.deps.db);

      // Resolve once
      await settlementService.resolveMarket(market.id, "YES");

      // Try to resolve again
      await expect(
        settlementService.resolveMarket(market.id, "NO")
      ).rejects.toThrow("Market already resolved");
    });

    test("throws error when market not found", async () => {
      // Generate a valid TypeID that doesn't exist in the database
      const fakeId = typeIdGenerator("market");

      await expect(
        settlementService.resolveMarket(fakeId, "YES")
      ).rejects.toThrow("Market not found");
    });
  });

  describe("settleMarket", () => {
    test("pays winners with fixed point returns", async () => {
      const user1 = UserId.parse(testEnv.users.authenticated.id);
      const user2 = UserId.parse(testEnv.users.unauthenticated.id);

      // Create market
      const market = await createTestMarket(testEnv.deps.db, {
        betAmount: "10.00",
      });

      // Fund users and create balance records
      await fundUserPoints(testEnv.deps.pointsService, user1, 100);
      await fundUserPoints(testEnv.deps.pointsService, user2, 100);

      // Create bets directly (bypassing balance service for test setup)
      await createTestBet({
        db: testEnv.deps.db,
        userId: user1,
        marketId: market.id,
        vote: "YES",
        pointsSpent: 3,
      });
      await createTestBet({
        db: testEnv.deps.db,
        userId: user2,
        marketId: market.id,
        vote: "NO",
        pointsSpent: 3,
      });

      // Fixed point returns: winners get 3 points back (their original bet)

      const result = await settlementService.settleMarket(market.id, "YES");

      expect(result.settled).toBe(2);
      expect(result.totalPointsReturned).toBe(3); // Only winner gets points back

      // Verify user1's bet was marked as WON
      const user1Bets = await testEnv.deps.db
        .select()
        .from(DB_SCHEMA.bet)
        .where(eq(DB_SCHEMA.bet.userId, user1));

      const user1Bet = user1Bets.find((b) => b.marketId === market.id);
      expect(user1Bet?.status).toBe("WON");
      expect(user1Bet?.pointsReturned).toBe(3);

      // Verify user2's bet was marked as LOST
      const user2Bets = await testEnv.deps.db
        .select()
        .from(DB_SCHEMA.bet)
        .where(eq(DB_SCHEMA.bet.userId, user2));

      const user2Bet = user2Bets.find((b) => b.marketId === market.id);
      expect(user2Bet?.status).toBe("LOST");
      expect(user2Bet?.pointsReturned).toBe(0);
    });

    test("refunds all when no winners", async () => {
      const user1 = UserId.parse(testEnv.users.authenticated.id);
      const user2 = UserId.parse(testEnv.users.unauthenticated.id);

      // Create market
      const market = await createTestMarket(testEnv.deps.db);

      // Fund users
      await fundUserPoints(testEnv.deps.pointsService, user1, 50);
      await fundUserPoints(testEnv.deps.pointsService, user2, 50);

      // All users bet YES
      await createTestBet({
        db: testEnv.deps.db,
        userId: user1,
        marketId: market.id,
        vote: "YES",
        pointsSpent: 3,
      });
      await createTestBet({
        db: testEnv.deps.db,
        userId: user2,
        marketId: market.id,
        vote: "YES",
        pointsSpent: 3,
      });

      // Result is NO - no winners
      const result = await settlementService.settleMarket(market.id, "NO");

      expect(result.settled).toBe(2);

      // Verify all bets were refunded
      const bets = await testEnv.deps.db
        .select()
        .from(DB_SCHEMA.bet)
        .where(eq(DB_SCHEMA.bet.marketId, market.id));

      for (const bet of bets) {
        expect(bet.status).toBe("REFUNDED");
        expect(bet.pointsReturned).toBe(bet.pointsSpent);
      }
    });

    test("returns early when no bets on market", async () => {
      const market = await createTestMarket(testEnv.deps.db);

      const result = await settlementService.settleMarket(market.id, "YES");

      expect(result.settled).toBe(0);
      expect(result.totalPointsReturned).toBe(0);
    });
  });

  describe("refundAllBets", () => {
    test("refunds all bets and credits points", async () => {
      const user1 = UserId.parse(testEnv.users.authenticated.id);

      // Create market
      const market = await createTestMarket(testEnv.deps.db);

      // Fund user
      await fundUserPoints(testEnv.deps.pointsService, user1, 50);

      // Create bet
      const bet = await createTestBet({
        db: testEnv.deps.db,
        userId: user1,
        marketId: market.id,
        vote: "YES",
        pointsSpent: 3,
      });

      // Get points before refund
      const pointsBefore = await testEnv.deps.pointsService.getPoints(user1);

      // Refund
      const result = await settlementService.refundAllBets(market.id, [
        { id: bet.id, userId: user1, pointsSpent: bet.pointsSpent },
      ]);

      expect(result.settled).toBe(1);
      expect(result.totalPointsReturned).toBe(3);

      // Verify points were credited
      const pointsAfter = await testEnv.deps.pointsService.getPoints(user1);
      expect(pointsAfter.points).toBe(pointsBefore.points + 3);

      // Verify bet status
      const updatedBets = await testEnv.deps.db
        .select()
        .from(DB_SCHEMA.bet)
        .where(eq(DB_SCHEMA.bet.id, bet.id));

      expect(updatedBets[0]?.status).toBe("REFUNDED");
    });
  });

  describe("getMarketsToResolve", () => {
    test("returns markets past resolution deadline", async () => {
      // Create an ended market
      const endedMarket = await createEndedTestMarket(testEnv.deps.db);

      // Create an active market (should not be returned)
      await createTestMarket(testEnv.deps.db);

      const markets = await settlementService.getMarketsToResolve();

      // Should include the ended market
      const foundEnded = markets.find((m) => m.id === endedMarket.id);
      expect(foundEnded).toBeDefined();
    });

    test("excludes already resolved markets", async () => {
      // Create and resolve a market
      const market = await createEndedTestMarket(testEnv.deps.db);
      await settlementService.resolveMarket(market.id, "YES");

      const markets = await settlementService.getMarketsToResolve();

      // Should not include resolved market
      const found = markets.find((m) => m.id === market.id);
      expect(found).toBeUndefined();
    });
  });
});
