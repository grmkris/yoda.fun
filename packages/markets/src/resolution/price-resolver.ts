import type { PriceStrategy } from "@yoda.fun/shared/resolution-types";
import {
  CoinGeckoPriceResponseSchema,
  type PriceResolutionResult,
} from "@yoda.fun/shared/market.schema";

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

export async function fetchCoinGeckoPrice(symbol: string): Promise<number> {
  const url = `${COINGECKO_API_URL}/simple/price?ids=${encodeURIComponent(symbol)}&vs_currencies=usd&include_24hr_change=true`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `CoinGecko API error: ${response.status} ${response.statusText}`
    );
  }

  const data = CoinGeckoPriceResponseSchema.parse(await response.json());
  const coinData = data[symbol.toLowerCase()];

  if (!coinData?.usd) {
    throw new Error(`Price not found for symbol: ${symbol}`);
  }

  return coinData.usd;
}

export interface PriceResolverDeps {
  fetchPrice: (coinId: string) => Promise<number>;
}

export function createPriceResolverService(deps: PriceResolverDeps) {
  const { fetchPrice } = deps;

  return {
    resolvePriceMarket: async (
      strategy: PriceStrategy
    ): Promise<PriceResolutionResult> => {
      const { coinId, operator, threshold } = strategy;

      const price = await fetchPrice(coinId);

      const meetsThreshold =
        operator === ">=" || operator === ">"
          ? price >= threshold
          : price <= threshold;

      const result = meetsThreshold ? "YES" : "NO";

      const comparisonText =
        operator === ">=" || operator === ">" ? "above" : "below";
      const reasoning = `${coinId.toUpperCase()} price is $${price.toLocaleString()}, which is ${
        meetsThreshold ? "" : "not "
      }${comparisonText} the threshold of $${threshold.toLocaleString()}.`;

      return {
        result,
        confidence: 100,
        reasoning,
        sources: [
          {
            url: `https://www.coingecko.com/en/coins/${coinId}`,
            snippet: `${coinId.toUpperCase()}: $${price.toLocaleString()} USD`,
          },
        ],
        priceAtResolution: price,
      };
    },
  };
}

export type PriceResolverService = ReturnType<
  typeof createPriceResolverService
>;

export const priceResolverService = createPriceResolverService({
  fetchPrice: fetchCoinGeckoPrice,
});

export const resolvePriceMarket = priceResolverService.resolvePriceMarket;
