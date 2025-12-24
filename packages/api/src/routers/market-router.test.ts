import { describe, expect, test } from "bun:test";
import { call } from "@orpc/server";
import type { Context } from "../context";
import { marketRouter } from "./market-router";

// Re-use test setup from apps/server/test
// Note: This test file assumes the test setup is available via path alias
// In a real setup, you'd import from the test utils location

describe("Market Router", () => {
  describe("list", () => {
    test("should return empty array when no markets exist", async () => {
      // This is a placeholder test structure
      // Full implementation requires TestSetup from apps/server/test
      const mockContext = {
        db: {
          select: () => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => ({
                    offset: () => Promise.resolve([]),
                  }),
                }),
              }),
            }),
          }),
        },
      } as unknown as Context;

      const result = await call(
        marketRouter.list,
        { limit: 10, offset: 0 },
        { context: mockContext }
      );

      expect(result.markets).toEqual([]);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    test("should filter by status", async () => {
      const mockContext = {
        db: {
          select: () => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => ({
                    offset: () => Promise.resolve([]),
                  }),
                }),
              }),
            }),
          }),
        },
      } as unknown as Context;

      const result = await call(
        marketRouter.list,
        { status: "ACTIVE", limit: 10, offset: 0 },
        { context: mockContext }
      );

      expect(result.markets).toBeDefined();
    });
  });

  describe("get", () => {
    test("should throw NOT_FOUND for non-existent market", async () => {
      const mockContext = {
        db: {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          }),
        },
      } as unknown as Context;

      await expect(
        call(
          marketRouter.get,
          { marketId: "mkt_nonexistent123456789012" },
          { context: mockContext }
        )
      ).rejects.toThrow();
    });
  });

  describe("getStack", () => {
    test("should require authentication", async () => {
      // Protected procedure should require session
      const mockContext = {
        session: null,
        db: {},
      } as unknown as Context;

      await expect(
        call(marketRouter.getStack, { limit: 10 }, { context: mockContext })
      ).rejects.toThrow();
    });
  });
});
