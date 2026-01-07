import type { MarketForResolution } from "@yoda.fun/shared/resolution-types";

export interface HistoricalMarket extends MarketForResolution {
  expectedResult: "YES" | "NO";
  notes: string;
}

/**
 * Historical markets with KNOWN outcomes for accuracy testing.
 * These are real-world events that have already occurred.
 */
export const HISTORICAL_MARKETS: HistoricalMarket[] = [
  // Sports - Super Bowl LVIII
  {
    title: "Did Chiefs win Super Bowl LVIII?",
    description:
      "Kansas City Chiefs vs San Francisco 49ers in Super Bowl LVIII",
    category: "sports",
    resolutionCriteria:
      "Resolves YES if Kansas City Chiefs won Super Bowl LVIII on February 11, 2024",
    createdAt: new Date("2024-02-10"),
    votingEndsAt: new Date("2024-02-11T23:59:00Z"),
    resolutionDeadline: new Date("2024-02-12"),
    expectedResult: "YES",
    notes: "Chiefs won 25-22 in overtime",
  },

  // Sports - Euro 2024
  {
    title: "Did Spain win Euro 2024?",
    description: "UEFA Euro 2024 final - Spain vs England",
    category: "sports",
    resolutionCriteria:
      "Resolves YES if Spain won the UEFA Euro 2024 championship on July 14, 2024",
    createdAt: new Date("2024-07-13"),
    votingEndsAt: new Date("2024-07-14T23:59:00Z"),
    resolutionDeadline: new Date("2024-07-15"),
    expectedResult: "YES",
    notes: "Spain beat England 2-1 in Berlin",
  },

  // Crypto - BTC $100k
  {
    title: "Did Bitcoin hit $100k in 2024?",
    description: "BTC/USD crossing $100,000 milestone",
    category: "crypto",
    resolutionCriteria:
      "Resolves YES if Bitcoin reached $100,000 USD at any point in 2024 per CoinGecko or CoinMarketCap",
    createdAt: new Date("2024-11-01"),
    votingEndsAt: new Date("2024-12-31T23:59:00Z"),
    resolutionDeadline: new Date("2025-01-01"),
    expectedResult: "YES",
    notes: "BTC hit ~$108k in December 2024",
  },

  // Politics - 2024 US Election
  {
    title: "Did Trump win 2024 US Presidential Election?",
    description: "2024 US Presidential Election result",
    category: "politics",
    resolutionCriteria:
      "Resolves YES if Donald Trump won the 2024 US Presidential Election on November 5, 2024",
    createdAt: new Date("2024-11-04"),
    votingEndsAt: new Date("2024-11-05T23:59:00Z"),
    resolutionDeadline: new Date("2024-11-10"),
    expectedResult: "YES",
    notes: "Trump won with 312 electoral votes",
  },

  // Tech - GPT-5 (NO outcome)
  {
    title: "Did OpenAI release GPT-5 in 2024?",
    description: "OpenAI GPT-5 model release",
    category: "tech",
    resolutionCriteria:
      "Resolves YES if OpenAI publicly released GPT-5 model by December 31, 2024",
    createdAt: new Date("2024-06-01"),
    votingEndsAt: new Date("2024-12-31T23:59:00Z"),
    resolutionDeadline: new Date("2025-01-01"),
    expectedResult: "NO",
    notes: "GPT-5 was not released in 2024, only o1 and o3 models",
  },

  // Sports - Wimbledon 2024
  {
    title: "Did Alcaraz win Wimbledon 2024 men's singles?",
    description: "Wimbledon 2024 men's singles final",
    category: "sports",
    resolutionCriteria:
      "Resolves YES if Carlos Alcaraz won the 2024 Wimbledon men's singles championship",
    createdAt: new Date("2024-07-13"),
    votingEndsAt: new Date("2024-07-14T18:00:00Z"),
    resolutionDeadline: new Date("2024-07-15"),
    expectedResult: "YES",
    notes: "Alcaraz beat Djokovic in straight sets",
  },

  // Entertainment - Oppenheimer Oscars
  {
    title: "Did Oppenheimer win Best Picture at 2024 Oscars?",
    description: "96th Academy Awards Best Picture",
    category: "movies",
    resolutionCriteria:
      "Resolves YES if Oppenheimer won Best Picture at the 96th Academy Awards on March 10, 2024",
    createdAt: new Date("2024-03-09"),
    votingEndsAt: new Date("2024-03-10T23:59:00Z"),
    resolutionDeadline: new Date("2024-03-11"),
    expectedResult: "YES",
    notes: "Oppenheimer won 7 Oscars including Best Picture",
  },

  // Tech - Apple Vision Pro (YES)
  {
    title: "Did Apple release Vision Pro in Q1 2024?",
    description: "Apple Vision Pro headset launch",
    category: "tech",
    resolutionCriteria:
      "Resolves YES if Apple Vision Pro was available for purchase by March 31, 2024",
    createdAt: new Date("2024-01-01"),
    votingEndsAt: new Date("2024-03-31T23:59:00Z"),
    resolutionDeadline: new Date("2024-04-01"),
    expectedResult: "YES",
    notes: "Vision Pro launched February 2, 2024",
  },
];
