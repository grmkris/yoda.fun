import type { AiClient } from "@yoda.fun/ai";
import { generateText, Output } from "@yoda.fun/ai";
import type { Logger } from "@yoda.fun/logger";
import { z } from "zod";
import type { CuratedTopic } from "../prompts";

interface TrendingResearchDeps {
  aiClient: AiClient;
  logger: Logger;
}

interface RawTrendingData {
  scheduled: string;
  twitter: string;
  news: string;
}

const CuratedTopicsSchema = z.object({
  topics: z.array(
    z.object({
      topic: z.string(),
      category: z.string(),
      eventDate: z.string().optional(),
      whyGood: z.string(),
    })
  ),
});

export async function researchTrendingTopics(
  deps: TrendingResearchDeps
): Promise<RawTrendingData> {
  const { aiClient, logger } = deps;

  const model = aiClient.getGoogleModel("gemini-2.5-flash");
  const xaiModel = aiClient.getModel({ provider: "xai", modelId: "grok-3-mini" });
  const { googleSearch } = aiClient.getGoogleTools();
  const { xSearch } = aiClient.getXaiTools();

  // Exa: Scheduled events with clear dates
  const exaQueries = [
    "NBA NFL NHL MLB sports games schedule today tomorrow this week",
    "movies releasing this week box office predictions theater",
    "TV show premieres finales streaming Netflix HBO this week",
    "tech product launches announcements Apple Google this week",
  ];

  // xSearch: Twitter/X real-time buzz
  const twitterQueries = [
    "trending viral moments celebrity drama today",
    "memes going viral TikTok challenges internet culture",
    "influencer news milestones subscribers followers",
  ];

  // Google: General news with outcomes
  const googlePrompt = `What are today's top news with clear outcomes?
- Political events, votes, elections
- Court rulings and verdicts
- Weather events and records
- Award ceremonies
List specific events with dates.`;

  logger.info({}, "Starting 3-source trending research");

  const [exaResults, twitterResults, googleResult] = await Promise.all([
    // Exa searches
    Promise.all(
      exaQueries.map((q) =>
        aiClient.searchWithExa(q).then((r) => r.text).catch(() => "")
      )
    ),
    // xSearch (Twitter)
    Promise.all(
      twitterQueries.map((q) =>
        generateText({ model: xaiModel, tools: { xSearch: xSearch({}) }, prompt: q })
          .then((r) => r.text)
          .catch(() => "")
      )
    ),
    // Google search
    generateText({ model, tools: { google_search: googleSearch({}) }, prompt: googlePrompt })
      .then((r) => r.text)
      .catch(() => ""),
  ]);

  logger.info({
    exaCount: exaResults.filter(Boolean).length,
    twitterCount: twitterResults.filter(Boolean).length,
    hasGoogle: !!googleResult,
  }, "Trending research complete");

  return {
    scheduled: exaResults.join("\n\n"),
    twitter: twitterResults.join("\n\n"),
    news: googleResult,
  };
}

export async function curateBestTopics(
  rawData: RawTrendingData,
  deps: TrendingResearchDeps
): Promise<CuratedTopic[]> {
  const { aiClient } = deps;
  const model = aiClient.getGoogleModel("gemini-2.5-flash");

  const prompt = `Select TOP 20 prediction market topics from this data.

## SCHEDULED EVENTS (from Exa - sports, movies, TV, tech)
${rawData.scheduled || "None"}

## TWITTER/X TRENDING (viral, memes, celebrities)
${rawData.twitter || "None"}

## NEWS (politics, weather, announcements)
${rawData.news || "None"}

## CRITERIA
- Clear YES/NO outcome, happening in 24-72h
- Engaging for casual users (not just crypto traders!)
- Diverse mix across categories
- Categories: movies, tv, music, celebrities, gaming, sports, politics, tech, crypto, viral, memes, weather, other

Return JSON: { topics: [{ topic, category, eventDate?, whyGood }] }`;

  const result = await aiClient.generateText({
    model,
    output: Output.object({ schema: CuratedTopicsSchema }),
    prompt,
  });

  return result.output?.topics ?? [];
}

export async function getTrendingTopics(
  deps: TrendingResearchDeps
): Promise<CuratedTopic[]> {
  const rawData = await researchTrendingTopics(deps);
  return curateBestTopics(rawData, deps);
}
