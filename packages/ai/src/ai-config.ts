import type { AIModelConfig } from "./ai-providers";

/**
 * Centralized model configurations
 * Following ai-stilist pattern for consistent model selection per feature
 */
export const MODELS = {
  // xAI Grok models
  XAI_GROK_3: {
    provider: "xai",
    modelId: "grok-3",
  } as const satisfies AIModelConfig,

  XAI_GROK_3_MINI: {
    provider: "xai",
    modelId: "grok-3-mini",
  } as const satisfies AIModelConfig,

  XAI_GROK_3_FAST: {
    provider: "xai",
    modelId: "grok-3-fast",
  } as const satisfies AIModelConfig,
} as const;

/**
 * Context for market generation prompts
 */
export type MarketGenerationContext = {
  currentDate: string;
  categories?: string[];
  existingMarketTitles?: string[];
  targetCount: number;
};

/**
 * Context for market resolution prompts
 */
export type MarketResolutionContext = {
  marketTitle: string;
  marketDescription: string;
  resolutionCriteria?: string;
  votingEndedAt: string;
};

/**
 * Feature-specific AI configurations
 * Each feature has its own model and prompt builder
 */
export const FEATURES = {
  /**
   * Generate new betting markets from current events/trends
   */
  marketGeneration: {
    model: MODELS.XAI_GROK_3,
    systemPrompt: (ctx: MarketGenerationContext): string => {
      const sections: string[] = [];

      // Core identity
      sections.push(`You are an expert prediction market creator for a Tinder-style betting app called Yoda.fun.
Your job is to generate engaging, binary YES/NO betting markets based on current events and trends.`);

      // Priority rules
      sections.push(`## CRITICAL RULES
- Markets MUST be binary (YES or NO outcome only)
- Markets MUST have objective, verifiable resolution criteria
- Markets MUST resolve within 1-30 days (prefer 3-14 days)
- Markets should be engaging and fun, not boring corporate stuff
- NO markets about death, serious illness, or tragedy
- NO markets that could be manipulated by bettors
- Focus on sports, entertainment, tech, crypto, memes, and pop culture`);

      // Context
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

      // Output format
      sections.push(`## OUTPUT REQUIREMENTS
For each market provide:
1. title: Short, punchy question (max 100 chars) ending with "?"
2. description: 1-2 sentences explaining the market context
3. category: One of: sports, entertainment, tech, crypto, politics, memes, other
4. resolutionCriteria: Clear, objective criteria for determining YES or NO
5. votingDays: How many days until voting ends (1-30)
6. betAmount: Suggested bet amount in USD (0.10, 0.25, 0.50, 1.00, or 5.00)`);

      // Examples
      sections.push(`## GOOD EXAMPLES
- "Will Bitcoin hit $150k before January 2025?" (clear price target, date)
- "Will the next iPhone have a foldable screen?" (verifiable announcement)
- "Will Taylor Swift announce a new album this month?" (public announcement)

## BAD EXAMPLES (avoid these patterns)
- "Will the economy improve?" (subjective, unverifiable)
- "Will X be the best movie of the year?" (opinion-based)
- "Will someone famous die?" (morbid, inappropriate)`);

      return sections.join("\n\n");
    },
  },

  /**
   * Resolve a market outcome based on available information
   */
  marketResolution: {
    model: MODELS.XAI_GROK_3_MINI,
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

export type FeatureKey = keyof typeof FEATURES;
