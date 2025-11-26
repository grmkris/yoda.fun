import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { call } from "@orpc/server";
import { appRouter } from "@yoda.fun/api/routers";
import { createSettlementService } from "@yoda.fun/api/services/settlement-service";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import { createTestSetup, type TestSetup } from "test/test.setup";
import {
  createEndedTestMarket,
  createTestContext,
  createTestUserWithFunds,
  type E2ETestUser,
  generateWalletAddress,
  verifyBalanceIntegrity,
  waitForQueueJob,
} from "test/test-helpers";
import { createMarketResolutionWorker } from "@/workers/market-resolution.worker";

// Regex patterns for assertions (declared at top level for performance)
const MARKET_RESULT_REGEX = /^(YES|NO|INVALID)$/;
const BET_STATUS_REGEX = /^(WON|LOST|REFUNDED)$/;

describe("E2E: Complete User Journey", () => {
  let testEnv: TestSetup;
  let worker: { close: () => Promise<void> };

  // Test users
  let alice: E2ETestUser;
  let bob: E2ETestUser;
  let charlie: E2ETestUser;

  const INITIAL_BALANCE = 1000;

  beforeAll(async () => {
    testEnv = await createTestSetup();

    // Start resolution worker with real AI
    worker = createMarketResolutionWorker({
      queue: testEnv.deps.queue,
      db: testEnv.deps.db,
      logger: testEnv.deps.logger,
      aiClient: testEnv.deps.aiClient,
    });

    // Create test users with funds
    alice = await createTestUserWithFunds(
      testEnv,
      "Alice",
      "alice@e2e.test",
      INITIAL_BALANCE
    );
    bob = await createTestUserWithFunds(
      testEnv,
      "Bob",
      "bob@e2e.test",
      INITIAL_BALANCE
    );
    charlie = await createTestUserWithFunds(
      testEnv,
      "Charlie",
      "charlie@e2e.test",
      INITIAL_BALANCE
    );

    testEnv.deps.logger.info({
      msg: "E2E test users created",
      users: [alice.email, bob.email, charlie.email],
    });
  });

  afterAll(async () => {
    await worker.close();
    await testEnv.close();
  });

  test("Full journey: deposit -> bet -> AI resolve -> payout -> withdraw", async () => {
    // Create contexts for each user
    const aliceCtx = await createTestContext({
      token: alice.token,
      testSetup: testEnv,
    });
    const bobCtx = await createTestContext({
      token: bob.token,
      testSetup: testEnv,
    });
    const charlieCtx = await createTestContext({
      token: charlie.token,
      testSetup: testEnv,
    });

    // ========== PHASE 1: VERIFY INITIAL BALANCES ==========
    const aliceInitial = await call(appRouter.balance.get, undefined, {
      context: aliceCtx,
    });
    expect(aliceInitial.available).toBe(INITIAL_BALANCE);

    // ========== PHASE 2: CREATE MARKET ==========
    // Clear factual question for AI resolution
    const market = await createEndedTestMarket(testEnv.deps.db, {
      title: "Is water composed of hydrogen and oxygen atoms?",
      description:
        "This market resolves YES if water (H2O) is composed of hydrogen and oxygen atoms. Scientific fact check.",
      betAmount: "10.00",
    });

    testEnv.deps.logger.info({
      msg: "Market created for E2E test",
      marketId: market.id,
    });

    // ========== PHASE 3: PLACE BETS ==========
    // Alice bets YES ($30 = 3 bets worth)
    // Bob bets NO ($20 = 2 bets)
    // Charlie bets YES ($50 = 5 bets)
    // Total pool: $100, YES pool: $80, NO pool: $20

    // For simplicity, we'll place single bets at the market bet amount
    await call(
      appRouter.bet.place,
      { marketId: market.id, vote: "YES" },
      { context: aliceCtx }
    );
    await call(
      appRouter.bet.place,
      { marketId: market.id, vote: "NO" },
      { context: bobCtx }
    );
    await call(
      appRouter.bet.place,
      { marketId: market.id, vote: "YES" },
      { context: charlieCtx }
    );

    // Verify balances deducted (each user placed 1 bet of $10)
    const aliceAfterBet = await call(appRouter.balance.get, undefined, {
      context: aliceCtx,
    });
    const bobAfterBet = await call(appRouter.balance.get, undefined, {
      context: bobCtx,
    });
    const charlieAfterBet = await call(appRouter.balance.get, undefined, {
      context: charlieCtx,
    });

    expect(aliceAfterBet.available).toBe(INITIAL_BALANCE - 10);
    expect(bobAfterBet.available).toBe(INITIAL_BALANCE - 10);
    expect(charlieAfterBet.available).toBe(INITIAL_BALANCE - 10);

    testEnv.deps.logger.info({
      msg: "Bets placed",
      alice: aliceAfterBet.available,
      bob: bobAfterBet.available,
      charlie: charlieAfterBet.available,
    });

    // ========== PHASE 4: QUEUE RESOLUTION ==========
    const { jobId } = await testEnv.deps.queue.addJob("resolve-market", {
      marketId: market.id,
    });

    if (!jobId) {
      throw new Error("Failed to create resolution job");
    }

    // Wait for AI resolution
    await waitForQueueJob(testEnv.deps.queue, "resolve-market", jobId, 45_000);

    // ========== PHASE 5: VERIFY RESOLUTION ==========
    const resolvedMarket = await call(
      appRouter.market.get,
      { marketId: market.id },
      { context: aliceCtx }
    );

    if (!resolvedMarket) {
      throw new Error("Market not found after resolution");
    }

    expect(resolvedMarket.status).toBe("RESOLVED");
    expect(resolvedMarket.result).toMatch(MARKET_RESULT_REGEX);

    testEnv.deps.logger.info({
      msg: "Market resolved",
      marketId: market.id,
      result: resolvedMarket.result,
      confidence: resolvedMarket.resolutionConfidence,
    });

    // ========== PHASE 6: VERIFY PAYOUTS ==========
    // Parimutuel calculation:
    // Total pool: $30 (3 users x $10)
    // If YES wins (expected): Alice and Charlie split pool proportionally
    //   - YES pool: $20 (Alice $10 + Charlie $10)
    //   - Alice gets: ($10/$20) * $30 = $15
    //   - Charlie gets: ($10/$20) * $30 = $15
    //   - Bob gets: $0
    // If NO wins: Bob gets entire pool ($30)

    const aliceAfterSettle = await call(appRouter.balance.get, undefined, {
      context: aliceCtx,
    });
    const bobAfterSettle = await call(appRouter.balance.get, undefined, {
      context: bobCtx,
    });
    const charlieAfterSettle = await call(appRouter.balance.get, undefined, {
      context: charlieCtx,
    });

    testEnv.deps.logger.info({
      msg: "Balances after settlement",
      result: resolvedMarket.result,
      alice: aliceAfterSettle.available,
      bob: bobAfterSettle.available,
      charlie: charlieAfterSettle.available,
    });

    // Verify bet statuses changed
    const aliceBets = await call(
      appRouter.bet.history,
      { limit: 10, offset: 0 },
      { context: aliceCtx }
    );
    const marketBet = aliceBets.bets.find((b) => b.bet.marketId === market.id);
    expect(marketBet?.bet.status).toMatch(BET_STATUS_REGEX);

    // If YES (expected - water IS H2O)
    if (resolvedMarket.result === "YES") {
      // Winners: Alice, Charlie
      expect(aliceAfterSettle.available).toBeGreaterThan(INITIAL_BALANCE - 10);
      expect(charlieAfterSettle.available).toBeGreaterThan(
        INITIAL_BALANCE - 10
      );
      // Loser: Bob
      expect(bobAfterSettle.available).toBe(INITIAL_BALANCE - 10);
    } else if (resolvedMarket.result === "NO") {
      // Winner: Bob gets all
      expect(bobAfterSettle.available).toBeGreaterThan(INITIAL_BALANCE - 10);
      // Losers: Alice, Charlie
      expect(aliceAfterSettle.available).toBe(INITIAL_BALANCE - 10);
      expect(charlieAfterSettle.available).toBe(INITIAL_BALANCE - 10);
    }

    // ========== PHASE 7: WITHDRAWAL ==========
    const withdrawAmount = 50;
    const withdrawal = await call(
      appRouter.withdrawal.request,
      {
        amount: withdrawAmount,
        walletAddress: generateWalletAddress(),
      },
      { context: aliceCtx }
    );

    expect(withdrawal.status).toBe("PENDING");
    expect(Number(withdrawal.amount)).toBe(withdrawAmount);

    // Verify balance deducted for withdrawal
    const aliceAfterWithdraw = await call(appRouter.balance.get, undefined, {
      context: aliceCtx,
    });
    expect(aliceAfterWithdraw.available).toBe(
      aliceAfterSettle.available - withdrawAmount
    );
    expect(aliceAfterWithdraw.totalWithdrawn).toBe(withdrawAmount);

    // ========== PHASE 8: BALANCE INTEGRITY CHECK ==========
    const totalDeposited = INITIAL_BALANCE * 3;
    const integrity = await verifyBalanceIntegrity(
      testEnv.deps.db,
      totalDeposited
    );

    testEnv.deps.logger.info({
      msg: "Balance integrity check",
      valid: integrity.valid,
      actual: integrity.actual,
      expected: integrity.expected,
    });

    expect(integrity.valid).toBe(true);
  }, 60_000);

  test("Multi-user: parimutuel distribution with direct settlement", async () => {
    // Create fresh market (not ended, so we can bet)
    const market = await createEndedTestMarket(testEnv.deps.db, {
      title: "Test parimutuel math",
      betAmount: "25.00",
    });

    // Place different sized bets by using DB directly
    // Alice: YES $30, Bob: NO $20, Charlie: YES $50
    // Total: $100, YES: $80, NO: $20

    // Use the bet service directly to place specific amounts
    await testEnv.deps.db.insert(DB_SCHEMA.bet).values([
      {
        userId: alice.userId,
        marketId: market.id,
        vote: "YES",
        amount: "30.00",
        status: "ACTIVE",
      },
      {
        userId: bob.userId,
        marketId: market.id,
        vote: "NO",
        amount: "20.00",
        status: "ACTIVE",
      },
      {
        userId: charlie.userId,
        marketId: market.id,
        vote: "YES",
        amount: "50.00",
        status: "ACTIVE",
      },
    ]);

    // Deduct balances
    await testEnv.deps.balanceService.debitBalance(
      alice.userId,
      30,
      "BET_PLACED",
      { marketId: market.id }
    );
    await testEnv.deps.balanceService.debitBalance(
      bob.userId,
      20,
      "BET_PLACED",
      { marketId: market.id }
    );
    await testEnv.deps.balanceService.debitBalance(
      charlie.userId,
      50,
      "BET_PLACED",
      { marketId: market.id }
    );

    // Settle with YES result (manually, not via queue)
    const settlementService = createSettlementService({
      deps: { db: testEnv.deps.db, logger: testEnv.deps.logger },
    });

    await settlementService.resolveMarket(market.id, "YES", {
      confidence: 100,
      aiModelUsed: "test",
    });

    // Check payouts
    // Total pool: $100
    // YES pool: $80 (Alice $30 + Charlie $50)
    // Alice payout: ($30/$80) * $100 = $37.50
    // Charlie payout: ($50/$80) * $100 = $62.50
    // Bob payout: $0

    // Check Alice got her payout (~$37.50)
    // Her balance change = payout - bet = 37.50 - 30 = +7.50
    // But we need to check the actual DB values
    const aliceBets = await testEnv.deps.db
      .select()
      .from(DB_SCHEMA.bet)
      .where(eq(DB_SCHEMA.bet.userId, alice.userId));

    const aliceMarketBet = aliceBets.find((b) => b.marketId === market.id);
    expect(aliceMarketBet?.status).toBe("WON");
    expect(Number(aliceMarketBet?.payout)).toBeCloseTo(37.5, 1);

    const charlieBets = await testEnv.deps.db
      .select()
      .from(DB_SCHEMA.bet)
      .where(eq(DB_SCHEMA.bet.userId, charlie.userId));

    const charlieMarketBet = charlieBets.find((b) => b.marketId === market.id);
    expect(charlieMarketBet?.status).toBe("WON");
    expect(Number(charlieMarketBet?.payout)).toBeCloseTo(62.5, 1);

    const bobBets = await testEnv.deps.db
      .select()
      .from(DB_SCHEMA.bet)
      .where(eq(DB_SCHEMA.bet.userId, bob.userId));

    const bobMarketBet = bobBets.find((b) => b.marketId === market.id);
    expect(bobMarketBet?.status).toBe("LOST");
    expect(Number(bobMarketBet?.payout)).toBe(0);

    testEnv.deps.logger.info({
      msg: "Parimutuel distribution verified",
      alicePayout: aliceMarketBet?.payout,
      charliePayout: charlieMarketBet?.payout,
      bobPayout: bobMarketBet?.payout,
    });
  });

  test("Refund scenario: market resolves INVALID", async () => {
    const market = await createEndedTestMarket(testEnv.deps.db, {
      title: "Invalid resolution test",
      betAmount: "15.00",
    });

    // Place bets
    await testEnv.deps.db.insert(DB_SCHEMA.bet).values([
      {
        userId: alice.userId,
        marketId: market.id,
        vote: "YES",
        amount: "15.00",
        status: "ACTIVE",
      },
      {
        userId: bob.userId,
        marketId: market.id,
        vote: "NO",
        amount: "15.00",
        status: "ACTIVE",
      },
    ]);

    await testEnv.deps.balanceService.debitBalance(
      alice.userId,
      15,
      "BET_PLACED",
      { marketId: market.id }
    );
    await testEnv.deps.balanceService.debitBalance(
      bob.userId,
      15,
      "BET_PLACED",
      { marketId: market.id }
    );

    // Get balances before
    const aliceBefore = await testEnv.deps.balanceService.getBalance(
      alice.userId
    );
    const bobBefore = await testEnv.deps.balanceService.getBalance(bob.userId);

    // Resolve as INVALID
    const settlementService = createSettlementService({
      deps: { db: testEnv.deps.db, logger: testEnv.deps.logger },
    });

    await settlementService.resolveMarket(market.id, "INVALID", {
      confidence: 50,
      aiModelUsed: "test",
    });

    // Both should be refunded
    const aliceAfter = await testEnv.deps.balanceService.getBalance(
      alice.userId
    );
    const bobAfter = await testEnv.deps.balanceService.getBalance(bob.userId);

    expect(aliceAfter.available).toBe(aliceBefore.available + 15);
    expect(bobAfter.available).toBe(bobBefore.available + 15);

    // Check bet statuses
    const bets = await testEnv.deps.db
      .select()
      .from(DB_SCHEMA.bet)
      .where(eq(DB_SCHEMA.bet.marketId, market.id));

    for (const bet of bets) {
      expect(bet.status).toBe("REFUNDED");
      expect(Number(bet.payout)).toBe(Number(bet.amount));
    }

    testEnv.deps.logger.info({ msg: "INVALID resolution refund verified" });
  });

  test("Transaction history: complete audit trail", async () => {
    // Get all transactions for Alice
    const transactions = await testEnv.deps.db
      .select()
      .from(DB_SCHEMA.transaction)
      .where(eq(DB_SCHEMA.transaction.userId, alice.userId));

    // Should have various transaction types
    const types = new Set(transactions.map((t) => t.type));

    // Alice should have at least DEPOSIT from setup
    expect(types.has("DEPOSIT")).toBe(true);

    testEnv.deps.logger.info({
      msg: "Transaction audit",
      userId: alice.userId,
      transactionCount: transactions.length,
      types: Array.from(types),
    });

    // Each balance change should have a corresponding transaction
    expect(transactions.length).toBeGreaterThan(0);
  });
});
