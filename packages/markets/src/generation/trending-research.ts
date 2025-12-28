import { type AiClient, generateText } from "@yoda.fun/ai";
import type { Logger } from "@yoda.fun/logger";
import type {
  ResearchConfig,
  TopicConfig,
} from "@yoda.fun/shared/market.schema";
import { WORKFLOW_MODELS } from "../config";

// ============================================================================
// Prompt Builder
// ============================================================================

export interface GetTrendingTopicsParams {
  aiClient: AiClient;
  logger: Logger;
  config: ResearchConfig;
}

function buildResearchPrompt(
  topics: TopicConfig[],
  windowHours: number,
  previousTopics: string[]
): string {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  return `You are a news researcher for Yoda.fun prediction markets.
BROWSE THE WEB. Do not rely on memory.

CURRENT TIME: ${now.toISOString()}
WINDOW: FROM now UNTIL ${windowEnd.toISOString()} (next ${windowHours} hours)

CRITICAL: Only include FUTURE events. Do NOT include events that already happened.
Today is ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

TOPICS TO RESEARCH:
${topics.map((t) => `- ${t.category}: ${t.querySeeds.join(", ")}`).join("\n")}
${
  previousTopics.length > 0
    ? `
ALREADY RESEARCHED (skip these):
${previousTopics.map((t) => `- ${t}`).join("\n")}
`
    : ""
}
REQUIREMENTS:
- Event must happen AFTER ${now.toISOString()} (in the future)
- Include WHO, WHAT, WHEN, WHERE
- Use reputable sources (official sites, major news outlets)
- No opinion pieces or speculation

For each topic found:
- topic: What the event/topic is (concise, specific)
- category: One of movies, tv, music, celebrities, gaming, sports, politics, tech, crypto, viral, memes, weather, other
- eventDate: ISO date string when it happens (if known)
- whyGood: Why this makes a good prediction market (betting angle, what can people bet on)

Find 10-20 UPCOMING events with clear betting potential.`;
}

// ============================================================================
// Main Entry Point
// ============================================================================

export async function getTrendingTopics(
  params: GetTrendingTopicsParams
): Promise<string> {
  const { aiClient, logger, config } = params;
  const { topics } = config;
  const windowHours = config.windowHours ?? 72;
  const previousTopics = config.previousTopics ?? [];

  logger.info(
    {
      topicCount: topics.length,
      windowHours,
      previousCount: previousTopics.length,
    },
    "Starting trending research"
  );

  const model = aiClient.getGoogleModel(
    WORKFLOW_MODELS.trending.googleSearch.modelId
  );
  const { googleSearch } = aiClient.getGoogleTools();

  const prompt = buildResearchPrompt(topics, windowHours, previousTopics);

  const result = await generateText({
    model,
    tools: { google_search: googleSearch({}) },
    prompt,
  });

  return result.text;
}
