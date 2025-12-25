import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { fetchCoinGeckoPrice, resolvePriceMarket } from "./price-resolver";

const MOCK_PRICES: Record<string, number> = {
  bitcoin: 95000,
  ethereum: 3500,
};

const originalFetch = globalThis.fetch;

describe("Price Resolver", () => {
  beforeEach(() => {
    globalThis.fetch = mock((url: string | URL | Request) => {
      const urlStr = url.toString();
      const match = urlStr.match(/ids=([^&]+)/);
      const coinId = match?.[1]?.toLowerCase();

      if (coinId && MOCK_PRICES[coinId]) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              [coinId]: {
                usd: MOCK_PRICES[coinId],
                usd_24h_change: 2.5,
              },
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("fetchCoinGeckoPrice", () => {
    test("fetches bitcoin price from CoinGecko", async () => {
      const price = await fetchCoinGeckoPrice("bitcoin");

      expect(price).toBe(MOCK_PRICES.bitcoin);
      expect(typeof price).toBe("number");
    });

    test("fetches ethereum price from CoinGecko", async () => {
      const price = await fetchCoinGeckoPrice("ethereum");

      expect(price).toBe(MOCK_PRICES.ethereum);
      expect(typeof price).toBe("number");
    });

    test("throws error for invalid symbol", async () => {
      await expect(
        fetchCoinGeckoPrice("not-a-real-coin-xyz-123")
      ).rejects.toThrow("Price not found for symbol");
    });
  });

  describe("resolvePriceMarket", () => {
    test("resolves YES when bitcoin price above low threshold", async () => {
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: ">=", threshold: 1 },
      });

      expect(result.result).toBe("YES");
      expect(result.confidence).toBe(100);
      expect(result.priceAtResolution).toBe(MOCK_PRICES.bitcoin);
      expect(result.reasoning.toLowerCase()).toContain("bitcoin");
      expect(result.reasoning.toLowerCase()).toContain("above");
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]?.url).toContain("coingecko.com");
    });

    test("resolves NO when bitcoin price below high threshold", async () => {
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
    });

    test("resolves YES when price below threshold with <= operator", async () => {
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: "<=", threshold: 10_000_000 },
      });

      expect(result.result).toBe("YES");
      expect(result.reasoning.toLowerCase()).toContain("below");
    });

    test("resolves NO when price above threshold with <= operator", async () => {
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: "<=", threshold: 1 },
      });

      expect(result.result).toBe("NO");
    });

    test("includes source with coingecko URL and price snippet", async () => {
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
    });

    test("resolves YES with > operator when price is well above threshold", async () => {
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: ">", threshold: 1 },
      });

      expect(result.result).toBe("YES");
      expect(result.priceAtResolution).toBeGreaterThan(1);
    });

    test("resolves NO with > operator when price is well below threshold", async () => {
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: ">", threshold: 10_000_000 },
      });

      expect(result.result).toBe("NO");
    });

    test("resolves YES with < operator when price is well below threshold", async () => {
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: "<", threshold: 10_000_000 },
      });

      expect(result.result).toBe("YES");
    });

    test("resolves NO with < operator when price is well above threshold", async () => {
      const result = await resolvePriceMarket({
        type: "PRICE",
        provider: "coingecko",
        coinId: "bitcoin",
        condition: { operator: "<", threshold: 1 },
      });

      expect(result.result).toBe("NO");
    });
  });
});
