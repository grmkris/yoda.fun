import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { call, ORPCError } from "@orpc/server";
import { appRouter } from "@yoda.fun/api/routers";
import { typeIdGenerator, UserId, WithdrawalId } from "@yoda.fun/shared/typeid";
import { createTestSetup, type TestSetup } from "test/test.setup";
import {
  createTestContext,
  fundUserBalance,
  generateWalletAddress,
} from "test/test-helpers";

describe("Withdrawal Router", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  });

  afterAll(async () => {
    await testEnv.close();
  });

  describe("withdrawal.request", () => {
    test("successfully creates withdrawal when balance sufficient", async () => {
      const userId = UserId.parse(testEnv.users.authenticated.id);
      const walletAddress = generateWalletAddress();

      // Fund the user first
      await fundUserBalance(testEnv.deps.balanceService, userId, 100);

      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      const result = await call(
        appRouter.withdrawal.request,
        { amount: 50, walletAddress },
        { context }
      );

      expect(result.success).toBe(true);
      expect(result.amount).toBe(50);
      expect(result.walletAddress).toBe(walletAddress);
      expect(result.status).toBe("PENDING");
      expect(result.withdrawalId).toBeDefined();

      // Verify balance was deducted
      const balanceResult = await call(appRouter.balance.get, undefined, {
        context,
      });
      expect(balanceResult.available).toBe(50);
    });

    test("throws BAD_REQUEST when insufficient balance", async () => {
      const context = await createTestContext({
        token: testEnv.users.unauthenticated.token,
        testSetup: testEnv,
      });

      const walletAddress = generateWalletAddress();

      await expect(() =>
        call(
          appRouter.withdrawal.request,
          { amount: 1000, walletAddress },
          { context }
        )
      ).toThrow(ORPCError);

      try {
        await call(
          appRouter.withdrawal.request,
          { amount: 1000, walletAddress },
          { context }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ORPCError);
        expect((error as ORPCError<string, unknown>).code).toBe("BAD_REQUEST");
      }
    });

    test("throws BAD_REQUEST when wallet address invalid", async () => {
      const userId = UserId.parse(testEnv.users.authenticated.id);

      // Fund the user
      await fundUserBalance(testEnv.deps.balanceService, userId, 100);

      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      // Invalid wallet address (too short)
      await expect(() =>
        call(
          appRouter.withdrawal.request,
          { amount: 10, walletAddress: "0x123" },
          { context }
        )
      ).toThrow();
    });

    test("throws UNAUTHORIZED when not authenticated", async () => {
      const context = await createTestContext({ testSetup: testEnv });
      const walletAddress = generateWalletAddress();

      await expect(() =>
        call(
          appRouter.withdrawal.request,
          { amount: 10, walletAddress },
          { context }
        )
      ).toThrow(ORPCError);

      try {
        await call(
          appRouter.withdrawal.request,
          { amount: 10, walletAddress },
          { context }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ORPCError);
        expect((error as ORPCError<string, unknown>).code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("withdrawal.list", () => {
    test("returns empty array when no withdrawals", async () => {
      const context = await createTestContext({
        token: testEnv.users.unauthenticated.token,
        testSetup: testEnv,
      });

      const result = await call(
        appRouter.withdrawal.list,
        { limit: 10, offset: 0 },
        { context }
      );

      expect(result.withdrawals).toBeInstanceOf(Array);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    test("returns withdrawals with pagination", async () => {
      const userId = UserId.parse(testEnv.users.authenticated.id);

      // Fund and create multiple withdrawals
      await fundUserBalance(testEnv.deps.balanceService, userId, 500);

      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      // Create 3 withdrawals
      for (let i = 0; i < 3; i++) {
        await call(
          appRouter.withdrawal.request,
          { amount: 10, walletAddress: generateWalletAddress() },
          { context }
        );
      }

      // List with limit
      const result = await call(
        appRouter.withdrawal.list,
        { limit: 2, offset: 0 },
        { context }
      );

      expect(result.withdrawals.length).toBeLessThanOrEqual(2);
    });

    test("throws UNAUTHORIZED when not authenticated", async () => {
      const context = await createTestContext({ testSetup: testEnv });

      await expect(() =>
        call(appRouter.withdrawal.list, { limit: 10, offset: 0 }, { context })
      ).toThrow(ORPCError);
    });
  });

  describe("withdrawal.get", () => {
    test("returns withdrawal by ID", async () => {
      const userId = UserId.parse(testEnv.users.authenticated.id);

      // Fund and create a withdrawal
      await fundUserBalance(testEnv.deps.balanceService, userId, 100);

      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      const walletAddress = generateWalletAddress();
      const createResult = await call(
        appRouter.withdrawal.request,
        { amount: 25, walletAddress },
        { context }
      );

      // Get the withdrawal
      const withdrawalId = WithdrawalId.parse(createResult.withdrawalId);
      const result = await call(
        appRouter.withdrawal.get,
        { withdrawalId },
        { context }
      );

      expect(result.id).toBe(withdrawalId);
      expect(result.walletAddress).toBe(walletAddress);
      expect(Number(result.amount)).toBe(25);
    });

    test("throws NOT_FOUND for non-existent withdrawal", async () => {
      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      // Generate a valid TypeID that doesn't exist in the database
      const fakeId = typeIdGenerator("withdrawal");

      await expect(() =>
        call(appRouter.withdrawal.get, { withdrawalId: fakeId }, { context })
      ).toThrow(ORPCError);

      try {
        await call(
          appRouter.withdrawal.get,
          { withdrawalId: fakeId },
          { context }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ORPCError);
        expect((error as ORPCError<string, unknown>).code).toBe("NOT_FOUND");
      }
    });

    test("throws UNAUTHORIZED when not authenticated", async () => {
      const context = await createTestContext({ testSetup: testEnv });
      // Generate a valid TypeID that doesn't exist in the database
      const fakeId = typeIdGenerator("withdrawal");

      await expect(() =>
        call(appRouter.withdrawal.get, { withdrawalId: fakeId }, { context })
      ).toThrow(ORPCError);
    });
  });
});
