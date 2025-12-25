import { describe, expect, test } from "bun:test";
import { fetchCoinGeckoPrice, resolvePriceMarket } from "./price-resolver";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("Price Resolver", () => {
  describe("fetchCoinGeckoPrice", () => {
    test("fetches bitcoin price from CoinGecko", async () => {
      const price = await fetchCoinGeckoPrice("bitcoin");

      expect(price).toBeGreaterThan(0);
      expect(typeof price).toBe("number");
    }, 15_000);

    test("fetches ethereum price from CoinGecko", async () => {
      await delay(1500);
      const price = await fetchCoinGeckoPrice("ethereum");

      expect(price).toBeGreaterThan(0);
      expect(typeof price).toBe("number");
    }, 15_000);

    test("throws error for invalid symbol", async () => {
      await delay(1500);
      await expect(
        fetchCoinGeckoPrice("not-a-real-coin-xyz-123")
      ).rejects.toThrow("Price not found for symbol");
    }, 15_000);
  });

  describe("resolvePriceMarket", () => {
    test("resolves YES when bitcoin price above low threshold", async () => {
      await delay(1500);
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: ">=", threshold: 1 },
      });

      expect(result.result).toBe("YES");
      expect(result.confidence).toBe(100);
      expect(result.priceAtResolution).toBeGreaterThan(1);
      expect(result.reasoning.toLowerCase()).toContain("bitcoin");
      expect(result.reasoning.toLowerCase()).toContain("above");
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]?.url).toContain("coingecko.com");
    }, 15_000);

    test("resolves NO when bitcoin price below high threshold", async () => {
      await delay(1500);
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: ">=", threshold: 10_000_000 },
      });

      expect(result.result).toBe("NO");
      expect(result.confidence).toBe(100);
      expect(result.priceAtResolution).toBeLessThan(10_000_000);
      expect(result.reasoning.toLowerCase()).toContain("not");
    }, 15_000);

    test("resolves YES when price below threshold with <= operator", async () => {
      await delay(1500);
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: "<=", threshold: 10_000_000 },
      });

      expect(result.result).toBe("YES");
      expect(result.reasoning.toLowerCase()).toContain("below");
    }, 15_000);

    test("resolves NO when price above threshold with <= operator", async () => {
      await delay(1500);
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: "<=", threshold: 1 },
      });

      expect(result.result).toBe("NO");
    }, 15_000);

    test("includes source with coingecko URL and price snippet", async () => {
      await delay(1500);
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "ethereum",
        condition: { operator: ">=", threshold: 1 },
      });

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]?.url).toBe(
        "https://www.coingecko.com/en/coins/ethereum"
      );
      expect(result.sources[0]?.snippet).toContain("ETH");
      expect(result.sources[0]?.snippet).toContain("USD");
    }, 15_000);
  });
});
