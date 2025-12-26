import type { AIModelConfig } from "@yoda.fun/ai";
import type { TimeframePreset } from "./schemas";

const MODELS = {
  XAI_GROK_4_LATEST: {
    provider: "xai",
    modelId: "grok-4-latest",
  } as const satisfies AIModelConfig,

  XAI_GROK_4_1_FAST_REASONING: {
    provider: "xai",
    modelId: "grok-4-1-fast-reasoning",
  } as const satisfies AIModelConfig,

  GOOGLE_GEMINI_2_5_FLASH_THINKING: {
    provider: "google",
    modelId: "gemini-flash-latest",
  } as const satisfies AIModelConfig,
} as const;

export interface MarketGenerationContext {
  currentDate: string;
  categories?: string[];
  existingMarketTitles?: string[];
  targetCount: number;
  timeframe: TimeframePreset;
}

export interface MarketResolutionContext {
  marketTitle: string;
  marketDescription: string;
  resolutionCriteria?: string;
  votingEndedAt: string;
}

function getDurationGuidance(timeframe: TimeframePreset): string {
  return {
    immediate: `   IMPORTANT: Generate ONLY short-term markets (1-6 hours)
   { value: 2, unit: "hours" } - for live events happening NOW
   { value: 4, unit: "hours" } - for events happening today
   { value: 6, unit: "hours" } - maximum allowed duration
   DO NOT use days or months - only hours between 1-6`,
    short: `   Focus on near-term markets (1-3 days preferred)
   { value: 12, unit: "hours" } - for events happening today
   { value: 1, unit: "days" } - for tomorrow (preferred)
   { value: 2, unit: "days" } - for day after tomorrow
   { value: 3, unit: "days" } - maximum preferred duration
   Avoid durations longer than 3 days`,
    medium: `   For events with known future dates (3-14 days)
   { value: 5, unit: "days" } - for events this week
   { value: 7, unit: "days" } - for events next week
   { value: 14, unit: "days" } - maximum duration
   Use when event date is known in advance`,
  }[timeframe];
}

export const MARKET_PROMPTS = {
  generation: {
    model: MODELS.XAI_GROK_4_1_FAST_REASONING,
    systemPrompt: (ctx: MarketGenerationContext): string => {
      const sections: string[] = [];

      sections.push(`You are an expert prediction market creator for a Tinder-style betting app called Yoda.fun.
Your job is to generate engaging, binary YES/NO betting markets based on current events and trends.`);

      sections.push(`## CRITICAL RULES
- Markets MUST be binary (YES or NO outcome only)
- Markets MUST have objective, verifiable resolution criteria
- Markets should be engaging and fun, not boring corporate stuff
- NO markets about death, serious illness, or tragedy
- NO markets that could be manipulated by bettors
- Focus on sports, entertainment, tech, crypto, memes, and pop culture`);

      sections.push(`## CONTEXT
- Current date: ${ctx.currentDate}
- Generate exactly ${ctx.targetCount} markets`);

      if (ctx.categories?.length) {
        sections.push(`- Focus on categories: ${ctx.categories.join(", ")}`);
      }

      if (ctx.existingMarketTitles?.length) {
        sections.push(`## AVOID DUPLICATES
These markets already exist, do NOT create similar ones:
${ctx.existingMarketTitles
  .slice(0, 20)
  .map((t) => `- ${t}`)
  .join("\n")}`);
      }

      sections.push(`## OUTPUT REQUIREMENTS
For each market provide:
1. title: Short, punchy question (max 100 chars) ending with "?"
2. description: 1-2 sentences explaining the market context
3. category: One of: sports, entertainment, tech, crypto, politics, memes, other
4. resolutionCriteria: Plain English statement describing how the market resolves.
   This is the MOST IMPORTANT field - an AI will read this to determine YES/NO.

   CRYPTO PRICES - mention the coin, price target, and data source:
   - "Resolves YES if Bitcoin price reaches $100,000 USD on CoinGecko"
   - "Resolves YES if Dogecoin trades above $0.42 on CoinGecko"
   - "Resolves YES if PEPE reaches $0.000025 on CoinGecko" (small decimals are fine!)

   SPORTS - mention the team, opponent if known, and outcome:
   - "Resolves YES if the Lakers win their game against the Celtics"
   - "Resolves YES if Liverpool wins their Premier League match"

   NEWS/EVENTS - describe what constitutes a YES:
   - "Resolves YES if Apple announces a new iPhone model"
   - "Resolves YES if Elon Musk tweets about Dogecoin"

5. duration: How long until voting ends
${getDurationGuidance(ctx.timeframe)}
6. betAmount: Suggested bet amount in USD (0.10, 0.25, 0.50, 1.00, or 5.00)`);

      sections.push(`## GOOD EXAMPLES
- "Will Bitcoin hit $100k today?"
  → resolutionCriteria: "Resolves YES if Bitcoin price reaches $100,000 USD on CoinGecko before market close"
  → duration: { value: 4, unit: "hours" }

- "Will the Lakers win tonight?"
  → resolutionCriteria: "Resolves YES if the Los Angeles Lakers win their scheduled NBA game"
  → duration: { value: 3, unit: "hours" }

- "Will Elon tweet about Dogecoin today?"
  → resolutionCriteria: "Resolves YES if Elon Musk posts about Dogecoin on X/Twitter"
  → duration: { value: 6, unit: "hours" }

- "Will PEPE reach $0.000025?"
  → resolutionCriteria: "Resolves YES if PEPE token reaches $0.000025 USD on CoinGecko"
  → duration: { value: 4, unit: "hours" }

## BAD EXAMPLES (avoid these patterns)
- "Will the economy improve?" (subjective, unverifiable)
- "Will X be the best movie of the year?" (opinion-based)
- "Will someone famous die?" (morbid, inappropriate)
- "Will Dogecoin pump 20%?" (percentage-based - use absolute price like "hit $0.50" instead)`);

      return sections.join("\n\n");
    },
  },

  resolution: {
    model: MODELS.XAI_GROK_4_1_FAST_REASONING,
    systemPrompt: (ctx: MarketResolutionContext): string => {
      const sections: string[] = [];

      sections.push(`You are a neutral market resolution judge for Yoda.fun prediction markets.
Your job is to determine whether a market resolved YES, NO, or INVALID based on facts.`);

      sections.push(`## MARKET TO RESOLVE
Title: ${ctx.marketTitle}
Description: ${ctx.marketDescription}
${ctx.resolutionCriteria ? `Resolution Criteria: ${ctx.resolutionCriteria}` : ""}
Voting Ended: ${ctx.votingEndedAt}`);

      sections.push(`## RESOLUTION RULES
1. Search for reliable sources to verify the outcome
2. Only resolve YES or NO if you have HIGH confidence (>85%)
3. Resolve as INVALID if:
   - The event hasn't happened yet
   - Information is contradictory or unclear
   - The market question was ambiguous
   - External factors made fair resolution impossible
4. Provide 1-3 source URLs that support your decision
5. Include a confidence score (0-100)`);

      sections.push(`## OUTPUT FORMAT
Provide:
- result: "YES", "NO", or "INVALID"
- confidence: 0-100 (your confidence in the resolution)
- reasoning: Brief explanation of your decision
- sources: Array of {url, snippet} with evidence`);

      return sections.join("\n\n");
    },
  },
} as const;
