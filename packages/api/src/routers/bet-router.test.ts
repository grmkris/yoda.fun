import { describe, expect, test } from "bun:test";
import { call } from "@orpc/server";
import { ok } from "neverthrow";
import type { Context } from "../context";
import { betRouter } from "./bet-router";

const TEST_MARKET_ID = "mkt_01kdbjw6mreneb77650wvn94d7";
const TEST_USER_ID = "usr_01kdbjw6mreneb776cc1febvam";
const TEST_BET_ID = "bet_01kdbjw6mreneb776qnge1fx74";

describe("Bet Router", () => {
  describe("place", () => {
    test("should require authentication", async () => {
      const mockContext = {
        session: null,
      } as unknown as Context;

      await expect(
        call(
          betRouter.place,
          { marketId: TEST_MARKET_ID, vote: "YES" },
          { context: mockContext }
        )
      ).rejects.toThrow();
    });

    test("should validate market ID format", async () => {
      const mockContext = {
        session: { user: { id: TEST_USER_ID } },
        betService: {
          placeBet: () => {
            throw new Error("Market not found");
          },
        },
      } as unknown as Context;

      await expect(
        call(
          betRouter.place,
          { marketId: "mkt_invalid_market_id", vote: "YES" },
          { context: mockContext }
        )
      ).rejects.toThrow();
    });

    test("should accept YES vote", async () => {
      const mockBet = {
        id: TEST_BET_ID,
        marketId: TEST_MARKET_ID,
        userId: TEST_USER_ID,
        vote: "YES",
        amount: "10.00",
        status: "ACTIVE",
      };

      const mockContext = {
        session: { user: { id: TEST_USER_ID } },
        betService: {
          placeBet: () => Promise.resolve(ok(mockBet)),
        },
      } as unknown as Context;

      const result = await call(
        betRouter.place,
        { marketId: TEST_MARKET_ID, vote: "YES" },
        { context: mockContext }
      );

      expect(result.success).toBe(true);
      expect(result.vote).toBe("YES");
    });

    test("should accept NO vote", async () => {
      const mockBet = {
        id: TEST_BET_ID,
        marketId: TEST_MARKET_ID,
        userId: TEST_USER_ID,
        vote: "NO",
        amount: "10.00",
        status: "ACTIVE",
      };

      const mockContext = {
        session: { user: { id: TEST_USER_ID } },
        betService: {
          placeBet: () => Promise.resolve(ok(mockBet)),
        },
      } as unknown as Context;

      const result = await call(
        betRouter.place,
        { marketId: TEST_MARKET_ID, vote: "NO" },
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
          id: TEST_BET_ID,
          marketId: TEST_MARKET_ID,
          vote: "YES",
          status: "ACTIVE",
        },
      ];

      const mockContext = {
        session: { user: { id: TEST_USER_ID } },
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
        session: { user: { id: TEST_USER_ID } },
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
