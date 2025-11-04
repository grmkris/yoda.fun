import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { call, ORPCError } from "@orpc/server";
import { appRouter } from "@yoda.fun/api/routers";
import { createTestSetup, type TestSetup } from "test/test.setup";
import {
  createAuthenticatedContext,
  createUnauthenticatedContext,
} from "test/test-helpers";

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
      const context = createUnauthenticatedContext();

      const result = await call(appRouter.healthCheck, undefined, {
        context,
      });

      expect(result).toBe("OK");
    });
  });

  describe("Private Data", () => {
    test("returns user data when authenticated", async () => {
      const context = createAuthenticatedContext(testEnv);

      const result = await call(appRouter.privateData, undefined, {
        context,
      });

      expect(result.message).toBe("This is private");
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(testEnv.users.authenticated.id);
      expect(result.user?.email).toBe(testEnv.users.authenticated.email);
    });

    test("throws UNAUTHORIZED when not authenticated", async () => {
      const context = createUnauthenticatedContext();

      await expect(() =>
        call(appRouter.privateData, undefined, { context })
      ).toThrow(ORPCError);

      try {
        await call(appRouter.privateData, undefined, { context });
      } catch (error) {
        expect(error).toBeInstanceOf(ORPCError);
        expect((error as ORPCError<string, unknown>).code).toBe("UNAUTHORIZED");
      }
    });
  });
});
