import type { PriceStrategy } from "@yoda.fun/shared/resolution-types";
import {
  CoinGeckoPriceResponseSchema,
  type PriceResolutionResult,
} from "../market-generation-schemas";

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

export async function resolvePriceMarket(
  strategy: PriceStrategy
): Promise<PriceResolutionResult> {
  const { coinId, condition } = strategy;
  const { operator, threshold } = condition;

  const price = await fetchCoinGeckoPrice(coinId);

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
}
