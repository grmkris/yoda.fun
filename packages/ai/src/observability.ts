import { AsyncLocalStorage } from "node:async_hooks";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { MarketId } from "@yoda.fun/shared/typeid";
import type { generateText as generateTextFn } from "ai";

export interface TraceContext {
  traceId?: string;
  marketId?: MarketId;
}

const traceContext = new AsyncLocalStorage<TraceContext>();

export function withTrace<T>(ctx: TraceContext, fn: () => T): T {
  return traceContext.run(ctx, fn);
}

export function getTraceContext(): TraceContext | undefined {
  return traceContext.getStore();
}

function extractProvider(model: unknown): string {
  if (!model || typeof model !== "object") {
    return "unknown";
  }
  const m = model as Record<string, unknown>;
  if (typeof m.provider === "string") {
    return m.provider;
  }
  if (typeof m.modelId === "string") {
    const id = m.modelId;
    if (id.includes("grok")) {
      return "xai";
    }
    if (id.includes("gemini")) {
      return "google";
    }
    if (id.includes("claude")) {
      return "anthropic";
    }
    if (id.includes("llama") || id.includes("mixtral")) {
      return "groq";
    }
  }
  return "unknown";
}

function extractModelId(model: unknown): string {
  if (!model || typeof model !== "object") {
    return "unknown";
  }
  const m = model as Record<string, unknown>;
  return typeof m.modelId === "string" ? m.modelId : "unknown";
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "grok-4-fast": { input: 3.0, output: 15.0 },
  "grok-3-mini": { input: 0.3, output: 0.5 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
};

function calculateCost(
  modelId: string,
  inputTokens?: number,
  outputTokens?: number
) {
  const pricing = MODEL_PRICING[modelId];
  if (!(pricing && inputTokens)) {
    return undefined;
  }
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = ((outputTokens ?? 0) / 1_000_000) * pricing.output;
  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
  };
}

export type GenerateTextFn = typeof generateTextFn;

export function wrapGenerateText(
  original: GenerateTextFn,
  db: Database,
  logger: Logger
): GenerateTextFn {
  return async function instrumentedGenerateText(params) {
    const ctx = traceContext.getStore();
    const start = performance.now();

    try {
      const result = await original(params);
      const latencyMs = Math.round(performance.now() - start);
      const modelId = extractModelId(params.model);
      const cost = calculateCost(
        modelId,
        result.usage?.inputTokens,
        result.usage?.outputTokens
      );

      db.insert(DB_SCHEMA.aiEvent)
        .values({
          traceId: ctx?.traceId,
          marketId: ctx?.marketId,
          provider: extractProvider(params.model),
          model: modelId,
          operation: "generateText",
          temperature: params.temperature?.toString(),
          maxTokens: params.maxOutputTokens,
          topP: params.topP?.toString(),
          toolsProvided: params.tools ? Object.keys(params.tools) : undefined,
          input: {
            prompt: params.prompt,
            system: params.system,
            messages: params.messages,
          },
          output: { text: result.text, object: result.output },
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          reasoningTokens: result.usage?.outputTokenDetails.reasoningTokens,
          cacheReadTokens: result.usage?.inputTokenDetails.cacheReadTokens,
          cacheWriteTokens: result.usage?.inputTokenDetails.cacheWriteTokens,
          finishReason: result.finishReason,
          responseId: result.response?.id,
          inputCostUsd: cost?.input?.toString(),
          outputCostUsd: cost?.output?.toString(),
          totalCostUsd: cost?.total?.toString(),
          latencyMs,
          success: true,
        })
        .catch((err) => logger.error({ err }, "Failed to log AI event"));

      return result;
    } catch (error) {
      const latencyMs = Math.round(performance.now() - start);
      const modelId = extractModelId(params.model);

      db.insert(DB_SCHEMA.aiEvent)
        .values({
          traceId: ctx?.traceId,
          marketId: ctx?.marketId,
          provider: extractProvider(params.model),
          model: modelId,
          operation: "generateText",
          temperature: params.temperature?.toString(),
          maxTokens: params.maxOutputTokens,
          topP: params.topP?.toString(),
          toolsProvided: params.tools ? Object.keys(params.tools) : undefined,
          input: {
            prompt: params.prompt,
            system: params.system,
            messages: params.messages,
          },
          latencyMs,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
        .catch((err) => logger.error({ err }, "Failed to log AI event"));

      throw error;
    }
  } as GenerateTextFn;
}
