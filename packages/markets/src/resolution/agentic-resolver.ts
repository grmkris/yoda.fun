import { type AiClient, Output, stepCountIs } from "@yoda.fun/ai";
import type { MarketForResolution } from "@yoda.fun/shared/resolution-types";
import { z } from "zod";
import { fetchCoinGeckoPrice } from "./price-resolver";
import { fetchRecentEvents } from "./sports-resolver";

const ResolutionOutputSchema = z.object({
  result: z.enum(["YES", "NO", "INVALID"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

const SearchResultSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
    })
  ),
});

export interface AgenticResolutionResult {
  result: "YES" | "NO" | "INVALID";
  confidence: number;
  reasoning: string;
  sources: Array<{ url: string; snippet: string }>;
  toolsUsed: string[];
}

function buildSystemPrompt(market: MarketForResolution): string {
  return `You are a prediction market resolution agent. Your job is to determine if a market resolved YES, NO, or INVALID.

## Market to Resolve
Title: ${market.title}
Description: ${market.description}
${market.resolutionCriteria ? `Resolution Criteria: ${market.resolutionCriteria}` : ""}
Category: ${market.category ?? "general"}

## Your Tools
You have access to these tools to gather information:

1. **getCryptoPrice** - Get current cryptocurrency price from CoinGecko
   Use for: crypto price targets (Bitcoin, Ethereum, Dogecoin, PEPE, etc.)

2. **getSportsResult** - Get recent sports event results from TheSportsDB
   Use for: sports outcomes (NBA, NFL, NHL, soccer, etc.)

3. **webSearch** - Search the web for news and information
   Use for: announcements, events, celebrity actions, general news

## Resolution Rules
- **YES**: Clear evidence the event happened or condition is met
- **NO**: Clear evidence the event did NOT happen or condition is NOT met
- **INVALID**: Cannot determine, event hasn't occurred yet, or insufficient information

## Instructions
1. Read the resolution criteria carefully
2. Use the appropriate tool(s) to gather data
3. Compare the data against the criteria
4. Make a decision with confidence level (0-100)

Be decisive. If you have enough information, resolve YES or NO.`;
}

async function getCryptoPrice(coinId: string): Promise<string> {
  const price = await fetchCoinGeckoPrice(coinId);
  return JSON.stringify({
    coinId,
    priceUsd: price,
    source: `https://www.coingecko.com/en/coins/${coinId}`,
  });
}

async function getSportsResult(team: string, sport: string): Promise<string> {
  const events = await fetchRecentEvents(sport, team);
  const event = events[0];

  if (!event) {
    return JSON.stringify({ team, sport, status: "no_events_found" });
  }

  return JSON.stringify({
    team,
    sport,
    event: event.strEvent,
    homeTeam: event.strHomeTeam,
    awayTeam: event.strAwayTeam,
    homeScore: event.intHomeScore ? Number.parseInt(event.intHomeScore, 10) : null,
    awayScore: event.intAwayScore ? Number.parseInt(event.intAwayScore, 10) : null,
    status: event.strStatus,
    date: event.dateEvent,
    source: `https://www.thesportsdb.com/event/${event.idEvent}`,
  });
}

async function webSearch(aiClient: AiClient, query: string): Promise<string> {
  const tools = aiClient.getGoogleTools();
  const model = aiClient.getGoogleModel("gemini-2.5-flash");

  const { output } = await aiClient.generateText({
    model,
    output: Output.object({ schema: SearchResultSchema }),
    tools: { google_search: tools.googleSearch({}) },
    prompt: `Search for: "${query}". Return structured results with URLs, titles, and snippets.`,
    stopWhen: stepCountIs(4),
  });

  return JSON.stringify({ query, results: output.results.slice(0, 5) });
}

export async function resolveWithAgent(
  market: MarketForResolution,
  aiClient: AiClient
): Promise<AgenticResolutionResult> {
  const model = aiClient.getModel({ provider: "xai", modelId: "grok-4-fast" });
  const toolsUsed: string[] = [];
  const sources: Array<{ url: string; snippet: string }> = [];

  const { output } = await aiClient.generateText({
    model,
    output: Output.object({ schema: ResolutionOutputSchema }),
    system: buildSystemPrompt(market),
    prompt: "Resolve this market now. Use the available tools to gather information, then make your decision.",
    tools: {
      getCryptoPrice: {
        description: "Get cryptocurrency price from CoinGecko (bitcoin, ethereum, dogecoin, pepe, solana)",
        parameters: z.object({ coinId: z.string() }),
        execute: async ({ coinId }) => {
          toolsUsed.push("getCryptoPrice");
          const result = await getCryptoPrice(coinId);
          const parsed = JSON.parse(result);
          if (parsed.source) {
            sources.push({ url: parsed.source, snippet: `${coinId}: $${parsed.priceUsd}` });
          }
          return result;
        },
      },
      getSportsResult: {
        description: "Get sports results for a team (nba, nfl, mlb, nhl, soccer, mma, boxing, tennis, esports)",
        parameters: z.object({ team: z.string(), sport: z.string() }),
        execute: async ({ team, sport }) => {
          toolsUsed.push("getSportsResult");
          const result = await getSportsResult(team, sport);
          const parsed = JSON.parse(result);
          if (parsed.source) {
            sources.push({ url: parsed.source, snippet: parsed.event ?? `${team} game` });
          }
          return result;
        },
      },
      webSearch: {
        description: "Search the web for news, announcements, or events",
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          toolsUsed.push("webSearch");
          const result = await webSearch(aiClient, query);
          const parsed = JSON.parse(result);
          for (const r of parsed.results?.slice(0, 3) ?? []) {
            sources.push({ url: r.url, snippet: r.title });
          }
          return result;
        },
      },
    },
    stopWhen: stepCountIs(8),
  });

  return {
    result: output.result,
    confidence: output.confidence,
    reasoning: output.reasoning,
    sources,
    toolsUsed: [...new Set(toolsUsed)],
  };
}
