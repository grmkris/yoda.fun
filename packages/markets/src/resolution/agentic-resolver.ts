import { type AiClient, Output, stepCountIs } from "@yoda.fun/ai";
import type { Logger } from "@yoda.fun/logger";
import type { MarketForResolution } from "@yoda.fun/shared/resolution-types";
import { z } from "zod";
import { WORKFLOW_MODELS } from "../config";

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
  const today = new Date().toISOString().split("T")[0];
  const createdAt = market.createdAt.toISOString().split("T")[0];
  const votingEnds = market.votingEndsAt.toISOString().split("T")[0];
  const deadline = market.resolutionDeadline.toISOString().split("T")[0];

  return `You are a prediction market resolution agent. Your job is to determine if a market resolved YES, NO, or INVALID.

## CRITICAL TEMPORAL CONTEXT
- Today's date: ${today}
- Market created: ${createdAt}
- Voting ends: ${votingEnds}
- Resolution deadline: ${deadline}
- **ONLY evaluate events between ${createdAt} and ${deadline}**
- Events before market creation are IRRELEVANT to resolution

## Market to Resolve
Title: ${market.title}
Description: ${market.description}
${market.resolutionCriteria ? `Resolution Criteria: ${market.resolutionCriteria}` : ""}
Category: ${market.category ?? "general"}

## Your Tool
You have access to **webSearch** to search the web for news, scores, prices, and any other information needed to resolve this market.

## Resolution Rules
- **YES**: Clear evidence the event happened or condition is met WITHIN the market timeframe
- **NO**: Clear evidence the event did NOT happen or condition is NOT met by the deadline
- **INVALID**: Cannot determine, event hasn't occurred yet, or insufficient information

## ANTI-HALLUCINATION RULES (CRITICAL)
1. NEVER fabricate data. If search returns no clear result, return INVALID
2. NEVER claim prices, scores, or events without direct source evidence
3. If sources conflict or are unclear, return INVALID
4. Quote EXACT numbers and dates from sources in your reasoning
5. Confidence > 90 requires multiple corroborating sources
6. If you cannot find data for the SPECIFIC timeframe (${createdAt} to ${deadline}), return INVALID

## Instructions
1. Read the resolution criteria and timeframe carefully
2. ALWAYS use webSearch to find current information - do not rely on memory
3. Include the DATE RANGE in your search queries (e.g., "Bitcoin price December 2025")
4. Search for specific facts: scores, prices, announcements, news
5. Verify the data falls within the market timeframe
6. Make a decision with confidence level (0-100)

Be decisive when you have clear evidence. Return INVALID when evidence is unclear or missing.`;
}

async function webSearch(
  aiClient: AiClient,
  query: string,
  logger?: Logger
): Promise<string> {
  logger?.debug({ query }, "webSearch: executing query");

  const tools = aiClient.getGoogleTools();
  const model = aiClient.getGoogleModel(
    WORKFLOW_MODELS.resolution.webSearch.modelId
  );

  const { output } = await aiClient.generateText({
    model,
    output: Output.object({ schema: SearchResultSchema }),
    tools: { google_search: tools.googleSearch({}) },
    prompt: `Search for: "${query}". Return structured results with URLs, titles, and snippets.`,
    stopWhen: stepCountIs(4),
  });

  const results = output.results.slice(0, 5);
  logger?.debug(
    { query, resultCount: results.length, results: results.map((r) => r.title) },
    "webSearch: results found"
  );

  return JSON.stringify({ query, results });
}

export async function resolveWithAgent(
  market: MarketForResolution,
  aiClient: AiClient,
  logger?: Logger
): Promise<AgenticResolutionResult> {
  logger?.info(
    {
      title: market.title,
      category: market.category,
      criteria: market.resolutionCriteria,
    },
    "resolveWithAgent: starting resolution"
  );

  const model = aiClient.getModel(WORKFLOW_MODELS.resolution.analysis);
  const toolsUsed: string[] = [];
  const sources: Array<{ url: string; snippet: string }> = [];

  const { output } = await aiClient.generateText({
    model,
    output: Output.object({ schema: ResolutionOutputSchema }),
    system: buildSystemPrompt(market),
    prompt:
      "Resolve this market now. Use webSearch to find current information, then make your decision.",
    tools: {
      webSearch: {
        description:
          "Search the web for news, scores, prices, announcements, or any information needed to resolve the market",
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          toolsUsed.push("webSearch");
          const result = await webSearch(aiClient, query, logger);
          const parsed = JSON.parse(result);
          // Only add sources with valid URLs (filter out errors/empty)
          for (const r of parsed.results?.slice(0, 3) ?? []) {
            if (r.url && r.title && !r.url.includes("error")) {
              sources.push({ url: r.url, snippet: r.title });
            }
          }
          return result;
        },
      },
    },
    stopWhen: stepCountIs(8),
  });

  logger?.info(
    {
      result: output.result,
      confidence: output.confidence,
      reasoning: output.reasoning,
      sourcesCount: sources.length,
      toolsUsed: [...new Set(toolsUsed)],
    },
    "resolveWithAgent: resolution complete"
  );

  return {
    result: output.result,
    confidence: output.confidence,
    reasoning: output.reasoning,
    sources,
    toolsUsed: [...new Set(toolsUsed)],
  };
}
