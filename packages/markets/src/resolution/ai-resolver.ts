import { type AiClient, Output } from "@yoda.fun/ai";
import {
  type AIResolutionResult,
  AIResolutionSchema,
  type MarketForResolution,
} from "@yoda.fun/shared/resolution-types";

export interface AIResolutionOptions {
  searchHint?: string;
  successIndicators?: string[];
}

export async function resolveWithAI(
  market: MarketForResolution,
  aiClient: AiClient,
  options?: AIResolutionOptions
): Promise<AIResolutionResult> {
  const criteriaContext = market.resolutionCriteria
    ? `Resolution criteria: ${market.resolutionCriteria}`
    : "Use the market description to determine the outcome.";

  const searchContext = options?.searchHint
    ? `\nSearch for: "${options.searchHint}"\nLook for these indicators of YES outcome: ${options.successIndicators?.join(", ") ?? "confirmation of the event"}`
    : "";

  const prompt = `You are resolving a prediction market. Analyze the available information and determine the outcome.

Market Title: ${market.title}
Market Description: ${market.description}

${criteriaContext}${searchContext}

Based on the current date and available information, determine if the market outcome is:
- YES: The predicted event happened/is true
- NO: The predicted event did not happen/is false
- INVALID: Cannot be determined or the market is unclear

Provide your analysis with confidence level (0-100) and reasoning.`;

  const model = aiClient.getModel({
    provider: "google",
    modelId: "gemini-2.5-flash",
  });

  const response = await aiClient.generateText({
    model,
    output: Output.object({ schema: AIResolutionSchema }),
    prompt,
  });

  return response.output;
}
