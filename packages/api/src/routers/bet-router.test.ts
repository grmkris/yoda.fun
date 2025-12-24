import { describe, expect, test } from "bun:test";
import { call } from "@orpc/server";
import type { Context } from "../context";
import { betRouter } from "./bet-router";

describe("Bet Router", () => {
  describe("place", () => {
    test("should require authentication", async () => {
      const mockContext = {
        session: null,
      } as unknown as Context;

      await expect(
        call(
          betRouter.place,
          { marketId: "mkt_test123456789012345", vote: "YES" },
          { context: mockContext }
        )
      ).rejects.toThrow();
    });

    test("should validate market ID format", async () => {
      const mockContext = {
        session: { user: { id: "user_test123456789012" } },
        betService: {
          placeBet: () => {
            throw new Error("Market not found");
          },
        },
      } as unknown as Context;

      await expect(
        call(
          betRouter.place,
          { marketId: "mkt_test123456789012345", vote: "YES" },
          { context: mockContext }
        )
      ).rejects.toThrow();
    });

    test("should accept YES vote", async () => {
      const mockBet = {
        id: "bet_test123456789012345",
        marketId: "mkt_test123456789012345",
        userId: "user_test123456789012",
        vote: "YES",
        amount: "10.00",
        status: "ACTIVE",
      };

      const mockContext = {
        session: { user: { id: "user_test123456789012" } },
        betService: {
          placeBet: () => Promise.resolve(mockBet),
        },
      } as unknown as Context;

      const result = await call(
        betRouter.place,
        { marketId: "mkt_test123456789012345", vote: "YES" },
        { context: mockContext }
      );

      expect(result.success).toBe(true);
      expect(result.vote).toBe("YES");
    });

    test("should accept NO vote", async () => {
      const mockBet = {
        id: "bet_test123456789012345",
        marketId: "mkt_test123456789012345",
        userId: "user_test123456789012",
        vote: "NO",
        amount: "10.00",
        status: "ACTIVE",
      };

      const mockContext = {
        session: { user: { id: "user_test123456789012" } },
        betService: {
          placeBet: () => Promise.resolve(mockBet),
        },
      } as unknown as Context;

      const result = await call(
        betRouter.place,
        { marketId: "mkt_test123456789012345", vote: "NO" },
        { context: mockContext }
      );

      expect(result.success).toBe(true);
      expect(result.vote).toBe("NO");
    });
  });

  describe("history", () => {
    test("should require authentication", async () => {
      const mockContext = {
        session: null,
      } as unknown as Context;

      await expect(
        call(
          betRouter.history,
          { limit: 10, offset: 0 },
          { context: mockContext }
        )
      ).rejects.toThrow();
    });

    test("should return bet history with default pagination", async () => {
      const mockBets = [
        {
          id: "bet_1",
          marketId: "mkt_1",
          vote: "YES",
          status: "ACTIVE",
        },
      ];

      const mockContext = {
        session: { user: { id: "user_test123456789012" } },
        betService: {
          getBetHistory: () => Promise.resolve(mockBets),
        },
      } as unknown as Context;

      const result = await call(
        betRouter.history,
        { limit: 10, offset: 0 },
        { context: mockContext }
      );

      expect(result.bets.length).toBe(mockBets.length);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    test("should filter by status", async () => {
      const mockContext = {
        session: { user: { id: "user_test123456789012" } },
        betService: {
          getBetHistory: (_userId: string, opts: { status?: string }) => {
            expect(opts.status).toBe("WON");
            return Promise.resolve([]);
          },
        },
      } as unknown as Context;

      const result = await call(
        betRouter.history,
        { status: "WON", limit: 10, offset: 0 },
        { context: mockContext }
      );

      expect(result.bets).toEqual([]);
    });
  });
});
