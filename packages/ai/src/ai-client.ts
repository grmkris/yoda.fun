import { withTracing } from "@posthog/ai/vercel";
import type { Logger } from "@yoda.fun/logger";
import type { Environment } from "@yoda.fun/shared/services";
import { typeIdGenerator } from "@yoda.fun/shared/typeid";
import type { LanguageModel as LanguageModelRetardio } from "ai";

import {
  experimental_generateImage,
  generateObject,
  generateText,
  streamObject,
  streamText,
} from "ai";

import type { PostHog } from "posthog-node";
import { type AIModelConfig, getModel } from "./ai-providers";

// type LanguageModel = string | LanguageModelV2;
// extract the type of LanguageModelV2 from the LanguageModel type
export type LanguageModel = Exclude<LanguageModelRetardio, string>;

export type AiClientConfig = {
  logger: Logger;
  providerConfigs: {
    googleGeminiApiKey?: string;
    anthropicApiKey?: string;
    groqApiKey?: string;
    xaiApiKey: string;
  };
  posthog?: PostHog;
  environment: Environment;
};

// biome-ignore lint/performance/noBarrelFile: main package entry point
export * from "ai";
export type {
  AIModelConfig,
  AiProvider,
  AnthropicModelId,
  GoogleGenerativeAIModelId,
  GroqModelId,
  Tool,
  XaiModelId,
} from "./ai-providers";

export type AiProviderCredentials = AiClientConfig["providerConfigs"];

export const createAiClient = (config: AiClientConfig): AiClient => ({
  getModel: (aiConfig: AIModelConfig) => {
    // Provider config map - data-driven approach
    const providerConfigs = {
      google: {
        key: config.providerConfigs.googleGeminiApiKey,
        name: "Google Gemini",
      },
      anthropic: {
        key: config.providerConfigs.anthropicApiKey,
        name: "Anthropic",
      },
      groq: {
        key: config.providerConfigs.groqApiKey,
        name: "Groq",
      },
      xai: {
        key: config.providerConfigs.xaiApiKey,
        name: "xAI",
      },
    } as const;

    const providerInfo = providerConfigs[aiConfig.provider];

    // Validate API key
    if (!providerInfo?.key) {
      throw new Error(
        `${providerInfo?.name || aiConfig.provider} API key is required`
      );
    }

    // Create base model
    const baseModel = getModel({
      modelConfig: aiConfig,
      providerConfig: {
        provider: aiConfig.provider,
        apiKey: providerInfo.key,
      },
    });

    // Return wrapped or unwrapped model
    return config.posthog
      ? withTracing(baseModel, config.posthog, {
          posthogTraceId: typeIdGenerator("aiGeneration"),
          posthogProperties: {
            environment: config.environment,
          },
        })
      : baseModel;
  },
  generateObject,
  streamObject,
  generateText,
  streamText,
  generateImage: experimental_generateImage,
  getProviderConfig: () => config.providerConfigs,
});

export type AiClient = {
  getProviderConfig: () => AiClientConfig["providerConfigs"];
  getModel: (aiConfig: AIModelConfig) => LanguageModel;
  generateObject: typeof generateObject;
  streamObject: typeof streamObject;
  generateText: typeof generateText;
  streamText: typeof streamText;
  generateImage: typeof experimental_generateImage;
};
