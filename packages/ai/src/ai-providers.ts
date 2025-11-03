import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
} from "@ai-sdk/google";
import { createGroq, type GroqProvider } from "@ai-sdk/groq";
import { createXai, type XaiProvider } from "@ai-sdk/xai";
import { z } from "zod";
import type { LanguageModel } from "./ai-client";

export type ModelProvider = "groq" | "anthropic" | "google" | "xai";

// Extract the model ID type from the providers' function parameters
export type AnthropicModelId = Parameters<AnthropicProvider>[0];
export type GroqModelId = Parameters<GroqProvider>[0];
export type GoogleGenerativeAIModelId =
  Parameters<GoogleGenerativeAIProvider>[0];
export type XaiModelId = Parameters<XaiProvider>[0];

export const AI_PROVIDERS = ["google", "anthropic", "groq", "xai"] as const;
export const AiProvider = z.enum(AI_PROVIDERS);
export type AiProvider = z.infer<typeof AiProvider>;

export type AIModelConfig =
  | {
      provider: "anthropic";
      modelId: AnthropicModelId;
    }
  | {
      provider: "groq";
      modelId: GroqModelId;
    }
  | {
      provider: "google";
      modelId: GoogleGenerativeAIModelId;
      metadata?: {
        useSearchGrounding?: boolean;
      };
    }
  | {
      provider: "xai";
      modelId: XaiModelId;
    };

export type AIProviderConfig = {
  provider: AiProvider;
  apiKey: string;
  url?: string;
};

/**
 * Get a language model instance from a provider
 * Note: For image models, use the provider's .image() method directly
 */
export function getModel(props: {
  modelConfig: AIModelConfig;
  providerConfig: AIProviderConfig;
}): LanguageModel {
  const { modelConfig, providerConfig } = props;
  switch (modelConfig.provider) {
    case "anthropic":
      return createAnthropic({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.url,
      })(modelConfig.modelId);
    case "groq":
      return createGroq({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.url,
      })(modelConfig.modelId);
    case "google":
      return createGoogleGenerativeAI({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.url,
      })(modelConfig.modelId);
    case "xai":
      return createXai({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.url,
      })(modelConfig.modelId);
    default:
      throw new Error(`Unsupported provider: ${JSON.stringify(modelConfig)}`);
  }
}

export type { Tool } from "ai";
