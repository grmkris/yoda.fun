import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { call, ORPCError } from "@orpc/server";
import { appRouter } from "@yoda.fun/api/routers";
import { UserId } from "@yoda.fun/shared/typeid";
import { createTestSetup, type TestSetup } from "test/test.setup";
import { createTestContext, fundUserBalance } from "test/test-helpers";

describe("Balance Router", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  });

  afterAll(async () => {
    await testEnv.close();
  });

  describe("balance.get", () => {
    test("returns zeros for new user with no balance", async () => {
      const context = await createTestContext({
        token: testEnv.users.authenticated.token,
        testSetup: testEnv,
      });

      const result = await call(appRouter.balance.get, undefined, { context });

      expect(result.available).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.totalDeposited).toBe(0);
      expect(result.totalWithdrawn).toBe(0);
    });

    test("returns correct balance after funding", async () => {
      const userId = UserId.parse(testEnv.users.unauthenticated.id);

      // Fund the user
      await fundUserBalance(testEnv.deps.balanceService, userId, 100);

      const context = await createTestContext({
        token: testEnv.users.unauthenticated.token,
        testSetup: testEnv,
      });

      const result = await call(appRouter.balance.get, undefined, { context });

      expect(result.available).toBe(100);
      expect(result.pending).toBe(0);
      expect(result.totalDeposited).toBe(100);
      expect(result.totalWithdrawn).toBe(0);
    });

    test("throws UNAUTHORIZED when not authenticated", async () => {
      const context = await createTestContext({ testSetup: testEnv });

      await expect(() =>
        call(appRouter.balance.get, undefined, { context })
      ).toThrow(ORPCError);

      try {
        await call(appRouter.balance.get, undefined, { context });
      } catch (error) {
        expect(error).toBeInstanceOf(ORPCError);
        expect((error as ORPCError<string, unknown>).code).toBe("UNAUTHORIZED");
      }
    });
  });
});
