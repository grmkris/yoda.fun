import { describe, expect, test } from "bun:test";
import {
  PriceStrategySchema,
  ResolutionStrategySchema,
  SportsStrategySchema,
  WebSearchStrategySchema,
} from "@yoda.fun/shared/resolution-types";
import {
  BET_AMOUNTS,
  DurationSchema,
  GeneratedMarketSchema,
  MARKET_CATEGORIES,
} from "./market-generation-schemas";

describe("Schema Validation", () => {
  describe("PriceStrategySchema", () => {
    test("valid PRICE strategy with threshold passes", () => {
      const strategy = {
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        operator: ">=",
        threshold: 150_000,
      };

      const result = PriceStrategySchema.safeParse(strategy);
      expect(result.success).toBe(true);
    });

    test("PRICE with threshold = 0 fails", () => {
      const strategy = {
        type: "PRICE",
        provider: "coingecko",
        coinId: "dogecoin",
        operator: ">=",
        threshold: 0,
      };

      const result = PriceStrategySchema.safeParse(strategy);
      expect(result.success).toBe(false);
    });

    test("PRICE with negative threshold fails", () => {
      const strategy = {
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        operator: ">=",
        threshold: -100,
      };

      const result = PriceStrategySchema.safeParse(strategy);
      expect(result.success).toBe(false);
    });

    test("PRICE with small positive threshold passes", () => {
      const strategy = {
        type: "PRICE",
        provider: "coingecko",
        coinId: "shiba-inu",
        operator: ">=",
        threshold: 0.000_01,
      };

      const result = PriceStrategySchema.safeParse(strategy);
      expect(result.success).toBe(true);
    });

    test("PRICE with all operators passes", () => {
      const operators = [">=", "<=", ">", "<"] as const;

      for (const operator of operators) {
        const strategy = {
          type: "PRICE",
          provider: "coingecko",
          coinId: "bitcoin",
          operator,
          threshold: 100_000,
        };

        const result = PriceStrategySchema.safeParse(strategy);
        expect(result.success).toBe(true);
      }
    });

    test("PRICE with invalid operator fails", () => {
      const strategy = {
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        operator: "==",
        threshold: 100_000,
      };

      const result = PriceStrategySchema.safeParse(strategy);
      expect(result.success).toBe(false);
    });
  });

  describe("SportsStrategySchema", () => {
    test("valid SPORTS strategy passes", () => {
      const strategy = {
        type: "SPORTS",
        provider: "thesportsdb",
        sport: "nba",
        teamName: "Lakers",
        outcome: "win",
      };

      const result = SportsStrategySchema.safeParse(strategy);
      expect(result.success).toBe(true);
    });

    test("SPORTS with invalid sport fails", () => {
      const strategy = {
        type: "SPORTS",
        provider: "thesportsdb",
        sport: "cricket",
        teamName: "India",
        outcome: "win",
      };

      const result = SportsStrategySchema.safeParse(strategy);
      expect(result.success).toBe(false);
    });

    test("SPORTS with invalid outcome fails", () => {
      const strategy = {
        type: "SPORTS",
        provider: "thesportsdb",
        sport: "nba",
        teamName: "Lakers",
        outcome: "draw",
      };

      const result = SportsStrategySchema.safeParse(strategy);
      expect(result.success).toBe(false);
    });

    test("SPORTS with all valid sports passes", () => {
      const sports = [
        "nba",
        "nfl",
        "mlb",
        "nhl",
        "soccer",
        "mma",
        "boxing",
        "tennis",
        "esports",
      ] as const;

      for (const sport of sports) {
        const strategy = {
          type: "SPORTS",
          provider: "thesportsdb",
          sport,
          teamName: "Test Team",
          outcome: "win",
        };

        const result = SportsStrategySchema.safeParse(strategy);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("WebSearchStrategySchema", () => {
    test("valid WEB_SEARCH strategy passes", () => {
      const strategy = {
        type: "WEB_SEARCH",
        searchQuery: "Taylor Swift new album announcement",
        successIndicators: ["announced", "new album"],
      };

      const result = WebSearchStrategySchema.safeParse(strategy);
      expect(result.success).toBe(true);
    });

    test("WEB_SEARCH with too short query fails", () => {
      const strategy = {
        type: "WEB_SEARCH",
        searchQuery: "test",
        successIndicators: ["test"],
      };

      const result = WebSearchStrategySchema.safeParse(strategy);
      expect(result.success).toBe(false);
    });

    test("WEB_SEARCH with empty successIndicators fails", () => {
      const strategy = {
        type: "WEB_SEARCH",
        searchQuery: "Taylor Swift announcement",
        successIndicators: [],
      };

      const result = WebSearchStrategySchema.safeParse(strategy);
      expect(result.success).toBe(false);
    });

    test("WEB_SEARCH with too many successIndicators fails", () => {
      const strategy = {
        type: "WEB_SEARCH",
        searchQuery: "Taylor Swift announcement",
        successIndicators: ["a", "b", "c", "d", "e", "f"],
      };

      const result = WebSearchStrategySchema.safeParse(strategy);
      expect(result.success).toBe(false);
    });
  });

  describe("ResolutionStrategySchema (discriminated union)", () => {
    test("correctly discriminates PRICE type", () => {
      const strategy = {
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        operator: ">=",
        threshold: 150_000,
      };

      const result = ResolutionStrategySchema.safeParse(strategy);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("PRICE");
      }
    });

    test("correctly discriminates SPORTS type", () => {
      const strategy = {
        type: "SPORTS",
        provider: "thesportsdb",
        sport: "nba",
        teamName: "Lakers",
        outcome: "win",
      };

      const result = ResolutionStrategySchema.safeParse(strategy);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("SPORTS");
      }
    });

    test("correctly discriminates WEB_SEARCH type", () => {
      const strategy = {
        type: "WEB_SEARCH",
        searchQuery: "Apple announcement 2025",
        successIndicators: ["announced"],
      };

      const result = ResolutionStrategySchema.safeParse(strategy);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("WEB_SEARCH");
      }
    });

    test("rejects invalid type", () => {
      const strategy = {
        type: "INVALID_TYPE",
        foo: "bar",
      };

      const result = ResolutionStrategySchema.safeParse(strategy);
      expect(result.success).toBe(false);
    });
  });

  describe("DurationSchema", () => {
    test("valid duration with hours passes", () => {
      const duration = { value: 4, unit: "hours" };
      const result = DurationSchema.safeParse(duration);
      expect(result.success).toBe(true);
    });

    test("valid duration with days passes", () => {
      const duration = { value: 7, unit: "days" };
      const result = DurationSchema.safeParse(duration);
      expect(result.success).toBe(true);
    });

    test("valid duration with months passes", () => {
      const duration = { value: 3, unit: "months" };
      const result = DurationSchema.safeParse(duration);
      expect(result.success).toBe(true);
    });

    test("duration with value 0 fails", () => {
      const duration = { value: 0, unit: "days" };
      const result = DurationSchema.safeParse(duration);
      expect(result.success).toBe(false);
    });

    test("duration with negative value fails", () => {
      const duration = { value: -1, unit: "days" };
      const result = DurationSchema.safeParse(duration);
      expect(result.success).toBe(false);
    });

    test("duration with invalid unit fails", () => {
      const duration = { value: 5, unit: "weeks" };
      const result = DurationSchema.safeParse(duration);
      expect(result.success).toBe(false);
    });
  });

  describe("GeneratedMarketSchema", () => {
    const validMarket = {
      title: "Will Bitcoin hit $150,000 by December?",
      description:
        "Bitcoin has been on a tear this year. Will it break the $150k barrier before the end of December?",
      category: "crypto",
      resolutionCriteria:
        "Resolves YES if Bitcoin price reaches $150,000 USD on CoinGecko before December 31, 2025",
      resolutionMethod: {
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        operator: ">=",
        threshold: 150_000,
      },
      duration: { value: 7, unit: "days" },
      betAmount: "1.00",
    };

    test("valid market passes", () => {
      const result = GeneratedMarketSchema.safeParse(validMarket);
      expect(result.success).toBe(true);
    });

    test("market with too short title fails", () => {
      const market = { ...validMarket, title: "BTC up?" };
      const result = GeneratedMarketSchema.safeParse(market);
      expect(result.success).toBe(false);
    });

    test("market with too long title fails", () => {
      const market = { ...validMarket, title: "A".repeat(101) };
      const result = GeneratedMarketSchema.safeParse(market);
      expect(result.success).toBe(false);
    });

    test("market with invalid category fails", () => {
      const market = { ...validMarket, category: "invalid" };
      const result = GeneratedMarketSchema.safeParse(market);
      expect(result.success).toBe(false);
    });

    test("market with all valid categories passes", () => {
      for (const category of MARKET_CATEGORIES) {
        const market = { ...validMarket, category };
        const result = GeneratedMarketSchema.safeParse(market);
        expect(result.success).toBe(true);
      }
    });

    test("market with invalid bet amount fails", () => {
      const market = { ...validMarket, betAmount: "2.00" };
      const result = GeneratedMarketSchema.safeParse(market);
      expect(result.success).toBe(false);
    });

    test("market with all valid bet amounts passes", () => {
      for (const betAmount of BET_AMOUNTS) {
        const market = { ...validMarket, betAmount };
        const result = GeneratedMarketSchema.safeParse(market);
        expect(result.success).toBe(true);
      }
    });

    test("market with PRICE threshold 0 fails", () => {
      const market = {
        ...validMarket,
        resolutionMethod: {
          type: "PRICE",
          provider: "coingecko",
          coinId: "dogecoin",
          operator: ">=",
          threshold: 0,
        },
      };
      const result = GeneratedMarketSchema.safeParse(market);
      expect(result.success).toBe(false);
    });
  });
});
