import { describe, expect, test } from "bun:test";
import {
  createWebSearchFallbackStrategy,
  validatePriceStrategy,
  validateSportsStrategy,
  validateWebSearchStrategy,
} from "./validation";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("Validation Layer", () => {
  describe("validatePriceStrategy", () => {
    test("valid coinId (bitcoin) returns valid", async () => {
      const result = await validatePriceStrategy({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        operator: ">=",
        threshold: 100_000,
      });

      expect(result.valid).toBe(true);
      expect(result.enrichedData?.currentPrice).toBeGreaterThan(0);
    }, 15_000);

    test("valid coinId (ethereum) returns valid with current price", async () => {
      await delay(1500);
      const result = await validatePriceStrategy({
        type: "PRICE",
        provider: "coingecko",
        coinId: "ethereum",
        operator: ">=",
        threshold: 1000,
      });

      expect(result.valid).toBe(true);
      expect(result.enrichedData?.currentPrice).toBeGreaterThan(0);
    }, 15_000);

    test("invalid coinId returns error", async () => {
      await delay(1500);
      const result = await validatePriceStrategy({
        type: "PRICE",
        provider: "coingecko",
        coinId: "not-a-real-coin-xyz-123",
        operator: ">=",
        threshold: 1,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("not found");
    }, 15_000);
  });

  describe("validateSportsStrategy", () => {
    test("valid NBA team returns valid", async () => {
      await delay(1500);
      const result = await validateSportsStrategy({
        type: "SPORTS",
        provider: "thesportsdb",
        sport: "nba",
        teamName: "Lakers",
        outcome: "win",
      });

      expect(result.valid).toBe(true);
    }, 15_000);

    test("unsupported sport returns error", async () => {
      const result = await validateSportsStrategy({
        type: "SPORTS",
        provider: "thesportsdb",
        sport: "cricket" as "nba",
        teamName: "India",
        outcome: "win",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unsupported sport");
    });
  });

  describe("validateWebSearchStrategy", () => {
    test("valid query returns valid", () => {
      const result = validateWebSearchStrategy({
        type: "WEB_SEARCH",
        searchQuery: "Taylor Swift new album announcement 2025",
        successIndicators: ["announced", "new album"],
      });

      expect(result.valid).toBe(true);
    });

    test("too short query returns error", () => {
      const result = validateWebSearchStrategy({
        type: "WEB_SEARCH",
        searchQuery: "test",
        successIndicators: ["test"],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Search query too short");
    });

    test("empty successIndicators returns error", () => {
      const result = validateWebSearchStrategy({
        type: "WEB_SEARCH",
        searchQuery: "Taylor Swift announcement",
        successIndicators: [],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("No success indicators provided");
    });
  });

  describe("createWebSearchFallbackStrategy", () => {
    test("creates fallback with title as query", () => {
      const fallback = createWebSearchFallbackStrategy(
        "Will Bitcoin hit $150k?",
        "Bitcoin price prediction market"
      );

      expect(fallback.type).toBe("WEB_SEARCH");
      expect(fallback.searchQuery).toBe("Will Bitcoin hit $150k?");
    });

    test("extracts keywords as success indicators", () => {
      const fallback = createWebSearchFallbackStrategy(
        "Will Taylor Swift announce a new album?",
        "Swift has been teasing new music on social media"
      );

      expect(fallback.successIndicators.length).toBeGreaterThan(0);
      expect(fallback.successIndicators.length).toBeLessThanOrEqual(5);
    });

    test("filters out stop words and short words", () => {
      const fallback = createWebSearchFallbackStrategy(
        "Will the Lakers win the game?",
        "The Lakers are playing tonight"
      );

      // Should not include: will, the, win, are
      for (const indicator of fallback.successIndicators) {
        expect(indicator.length).toBeGreaterThan(3);
        expect(["the", "will", "win", "are"]).not.toContain(indicator);
      }
    });
  });
});
