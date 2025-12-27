import { type AiClient, Output, stepCountIs } from "@yoda.fun/ai";
import type {
  MarketForResolution,
  WebSearchStrategy,
} from "@yoda.fun/shared/resolution-types";
import { z } from "zod";
import {
  type SearchResult,
  SearchResultItemSchema,
  type WebSearchResolutionResult,
} from "@yoda.fun/shared/market.schema";

const XaiSearchOutputSchema = z.object({
  webResults: z.array(SearchResultItemSchema),
  xResults: z.array(SearchResultItemSchema),
});

const GoogleSearchOutputSchema = z.object({
  results: z.array(SearchResultItemSchema),
});

const AnalysisOutputSchema = z.object({
  result: z.enum(["YES", "NO", "INVALID"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

function getSearchStartDate(daysBack = 30): string {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().split("T")[0] ?? "";
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

async function searchWithXai(
  aiClient: AiClient,
  query: string,
  startDate: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const today = getTodayDate();

  try {
    const tools = aiClient.getXaiTools();
    const model = aiClient.getXaiResponsesModel("grok-4-fast");

    const { output } = await aiClient.generateText({
      model,
      output: Output.object({ schema: XaiSearchOutputSchema }),
      system:
        "Search for the query using web and X/Twitter search. Return structured results with URLs, titles, and snippets for each result found.",
      prompt: `Search for: "${query}"`,
      tools: {
        web_search: tools.webSearch({
          enableImageUnderstanding: false,
        }),
        x_search: tools.xSearch({
          fromDate: startDate,
          toDate: today,
          enableImageUnderstanding: false,
          enableVideoUnderstanding: false,
        }),
      },
      stopWhen: stepCountIs(6),
    });

    if (output.webResults.length > 0) {
      results.push({
        provider: "xai_web",
        query,
        results: output.webResults,
      });
    }

    if (output.xResults.length > 0) {
      results.push({
        provider: "xai_x",
        query,
        results: output.xResults,
      });
    }
  } catch (error) {
    results.push({
      provider: "xai_web",
      query,
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return results;
}

async function searchWithGoogle(
  aiClient: AiClient,
  query: string
): Promise<SearchResult> {
  try {
    const tools = aiClient.getGoogleTools();
    const model = aiClient.getGoogleModel("gemini-2.5-flash");

    const { output } = await aiClient.generateText({
      model,
      output: Output.object({ schema: GoogleSearchOutputSchema }),
      tools: {
        google_search: tools.googleSearch({}),
      },
      prompt: `Search for: "${query}". Return structured results with URLs, titles, and snippets.`,
      stopWhen: stepCountIs(4),
    });

    return {
      provider: "google",
      query,
      results: output.results,
    };
  } catch (error) {
    return {
      provider: "google",
      query,
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function aggregateResults(
  settledResults: PromiseSettledResult<SearchResult | SearchResult[]>[]
): SearchResult[] {
  const allResults: SearchResult[] = [];

  for (const settled of settledResults) {
    if (settled.status === "fulfilled") {
      const value = settled.value;
      if (Array.isArray(value)) {
        allResults.push(...value);
      } else {
        allResults.push(value);
      }
    }
  }

  return allResults;
}

function formatSearchResultsForAI(searchResults: SearchResult[]): string {
  const sections: string[] = [];

  for (const result of searchResults) {
    if (result.results.length === 0) {
      if (result.error) {
        sections.push(
          `## ${result.provider.toUpperCase()} Search\nError: ${result.error}\n`
        );
      }
      continue;
    }

    const items = result.results
      .slice(0, 5)
      .map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}`)
      .join("\n\n");

    sections.push(
      `## ${result.provider.toUpperCase()} Search Results\n${items}\n`
    );
  }

  return sections.join("\n---\n\n");
}

function buildAnalysisSystemPrompt(
  market: MarketForResolution,
  successIndicators: string[]
): string {
  return `You are a prediction market resolution expert. Analyze search results and determine if the market resolved YES, NO, or INVALID.

## Market
Title: ${market.title}
Description: ${market.description}
${market.resolutionCriteria ? `Resolution Criteria: ${market.resolutionCriteria}` : ""}
Category: ${market.category ?? "general"}

## Success Indicators (for YES)
${successIndicators.map((i) => `- ${i}`).join("\n")}

## Rules
- YES: Clear evidence the event happened/is true
- NO: Clear evidence the event did NOT happen/is false
- INVALID: Event hasn't occurred, evidence contradictory/unclear, or insufficient information`;
}

async function analyzeSearchResults(
  aiClient: AiClient,
  market: MarketForResolution,
  searchResults: SearchResult[],
  successIndicators: string[]
): Promise<WebSearchResolutionResult> {
  const searchContext = formatSearchResultsForAI(searchResults);
  const toolsUsed = searchResults
    .filter((r) => r.results.length > 0)
    .map((r) => r.provider);

  if (toolsUsed.length === 0) {
    return {
      result: "INVALID",
      confidence: 0,
      reasoning: "All search providers failed or returned no results",
      sources: [],
      toolsUsed: [],
    };
  }

  const model = aiClient.getModel({ provider: "xai", modelId: "grok-4-fast" });

  const { output } = await aiClient.generateText({
    model,
    output: Output.object({ schema: AnalysisOutputSchema }),
    system: buildAnalysisSystemPrompt(market, successIndicators),
    prompt: `Analyze these search results and determine the market outcome:\n\n${searchContext}`,
  });

  const sources = searchResults
    .flatMap((r) => r.results.slice(0, 3))
    .slice(0, 10)
    .map((item) => ({ url: item.url, snippet: item.title }));

  return { ...output, sources, toolsUsed };
}

export async function resolveWebSearchMarket(
  aiClient: AiClient,
  market: MarketForResolution,
  strategy: WebSearchStrategy
): Promise<WebSearchResolutionResult> {
  const { searchQuery, successIndicators } = strategy;
  const startDate = getSearchStartDate(30);

  const [xaiResults, googleResult] = await Promise.allSettled([
    searchWithXai(aiClient, searchQuery, startDate),
    searchWithGoogle(aiClient, searchQuery),
  ]);

  const allResults = aggregateResults([xaiResults, googleResult]);
  return analyzeSearchResults(aiClient, market, allResults, successIndicators);
}
