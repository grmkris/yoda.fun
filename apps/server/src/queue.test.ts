import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import { typeIdGenerator, UserId } from "@yoda.fun/shared/typeid";
import { createTestSetup, type TestSetup } from "test/test.setup";
import {
  createEndedTestMarket,
  createTestBet,
  fundUserPoints,
} from "test/test-helpers";
import { createMarketResolutionWorker } from "@/workers/market-resolution.worker";

// Regex patterns for assertions (declared at top level for performance)
const MARKET_RESULT_REGEX = /^(YES|NO|INVALID)$/;
const BET_STATUS_REGEX = /^(WON|LOST|REFUNDED)$/;

describe("Market Resolution Queue", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();

    // Start real worker with AI client (closed via queue.close())
    createMarketResolutionWorker({
      queue: testEnv.deps.queue,
      db: testEnv.deps.db,
      logger: testEnv.deps.logger,
      aiClient: testEnv.deps.aiClient,
      fhevmClient: null as never,
    });
  });

  afterAll(async () => {
    await testEnv.close();
  });

  test("resolves market via queue job with real AI", async () => {
    const user1 = UserId.parse(testEnv.users.authenticated.id);
    const user2 = UserId.parse(testEnv.users.unauthenticated.id);

    // Create ended market with a clear factual question
    const market = await createEndedTestMarket(testEnv.deps.db, {
      title: "Is the sky blue during a clear day?",
      description:
        "This market resolves YES if the sky appears blue during a clear daytime sky. This is a test market for verifying AI resolution.",
      betAmount: "10.00",
    });

    // Fund users and place bets
    await fundUserPoints(testEnv.deps.pointsService, user1, 100);
    await fundUserPoints(testEnv.deps.pointsService, user2, 100);

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

    // Add job to queue with no delay
    const { jobId } = await testEnv.deps.queue.addJob(
      "resolve-market",
      { marketId: market.id },
      { delay: 0 }
    );

    if (!jobId) {
      throw new Error("Failed to create job");
    }

    // Poll for job completion (max 30 seconds)
    const maxWait = 30_000;
    const pollInterval = 500;
    let elapsed = 0;

    while (elapsed < maxWait) {
      const status = await testEnv.deps.queue.getJobStatus(
        "resolve-market",
        jobId
      );

      if (status?.state === "completed") {
        break;
      }

      if (status?.state === "failed") {
        throw new Error(`Job failed: ${status.failedReason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      elapsed += pollInterval;
    }

    // Verify market was resolved
    const resolvedMarkets = await testEnv.deps.db
      .select()
      .from(DB_SCHEMA.market)
      .where(eq(DB_SCHEMA.market.id, market.id));

    const resolvedMarket = resolvedMarkets[0];
    expect(resolvedMarket).toBeDefined();
    expect(resolvedMarket?.status).toBe("SETTLED");
    expect(resolvedMarket?.result).toMatch(MARKET_RESULT_REGEX);

    // Verify bets were settled
    const bets = await testEnv.deps.db
      .select()
      .from(DB_SCHEMA.bet)
      .where(eq(DB_SCHEMA.bet.marketId, market.id));

    for (const bet of bets) {
      expect(bet.status).toMatch(BET_STATUS_REGEX);
    }

    testEnv.deps.logger.info({
      msg: "Market resolved via queue",
      marketId: market.id,
      result: resolvedMarket?.result,
      confidence: resolvedMarket?.resolutionConfidence,
    });
  }, 60_000); // 60s timeout for AI

  test("skips already resolved market", async () => {
    // Create ended market
    const market = await createEndedTestMarket(testEnv.deps.db);

    // Manually mark as resolved
    await testEnv.deps.db
      .update(DB_SCHEMA.market)
      .set({ status: "SETTLED", result: "YES" })
      .where(eq(DB_SCHEMA.market.id, market.id));

    // Add job
    const { jobId } = await testEnv.deps.queue.addJob("resolve-market", {
      marketId: market.id,
    });

    if (!jobId) {
      throw new Error("Failed to create job");
    }

    // Wait for completion
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const status = await testEnv.deps.queue.getJobStatus(
      "resolve-market",
      jobId
    );

    // Job should complete successfully (early exit)
    expect(status?.state).toBe("completed");

    // Market should remain unchanged
    const markets = await testEnv.deps.db
      .select()
      .from(DB_SCHEMA.market)
      .where(eq(DB_SCHEMA.market.id, market.id));

    expect(markets[0]?.result).toBe("YES"); // unchanged
  });

  test("handles non-existent market gracefully", async () => {
    // Generate a valid TypeID that doesn't exist in the database
    const fakeId = typeIdGenerator("market");

    const { jobId } = await testEnv.deps.queue.addJob("resolve-market", {
      marketId: fakeId,
    });

    if (!jobId) {
      throw new Error("Failed to create job");
    }

    // Wait for completion
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const status = await testEnv.deps.queue.getJobStatus(
      "resolve-market",
      jobId
    );

    // Job completes with success: false (doesn't throw)
    expect(status?.state).toBe("completed");
    expect(status?.returnvalue?.success).toBe(false);
  });

  test("adds job with delay for future execution", async () => {
    const market = await createEndedTestMarket(testEnv.deps.db);

    // Add job with 5 second delay
    const { jobId } = await testEnv.deps.queue.addJob(
      "resolve-market",
      { marketId: market.id },
      { delay: 5000 }
    );

    if (!jobId) {
      throw new Error("Failed to create job");
    }

    // Check immediately - should be delayed
    const immediateStatus = await testEnv.deps.queue.getJobStatus(
      "resolve-market",
      jobId
    );

    expect(immediateStatus?.state).toBe("delayed");
  });
});
