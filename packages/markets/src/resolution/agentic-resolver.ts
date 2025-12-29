import { type AiClient, Output, stepCountIs } from "@yoda.fun/ai";
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

  return `You are a prediction market resolution agent. Your job is to determine if a market resolved YES, NO, or INVALID.

**Today's date is ${today}** - use this as your reference point when evaluating if events have occurred.

## Market to Resolve
Title: ${market.title}
Description: ${market.description}
${market.resolutionCriteria ? `Resolution Criteria: ${market.resolutionCriteria}` : ""}
Category: ${market.category ?? "general"}

## Your Tool
You have access to **webSearch** to search the web for news, scores, prices, and any other information needed to resolve this market.

## Resolution Rules
- **YES**: Clear evidence the event happened or condition is met
- **NO**: Clear evidence the event did NOT happen or condition is NOT met
- **INVALID**: Cannot determine, event hasn't occurred yet, or insufficient information

## Instructions
1. Read the resolution criteria carefully
2. ALWAYS use webSearch to find current information - do not rely on memory
3. Search for specific facts: scores, prices, announcements, news
4. Compare the data against the criteria
5. Make a decision with confidence level (0-100)

Be decisive. If you find clear evidence, resolve YES or NO.`;
}

async function webSearch(aiClient: AiClient, query: string): Promise<string> {
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

  return JSON.stringify({ query, results: output.results.slice(0, 5) });
}

export async function resolveWithAgent(
  market: MarketForResolution,
  aiClient: AiClient
): Promise<AgenticResolutionResult> {
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
