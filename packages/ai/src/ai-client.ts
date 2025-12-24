import { devToolsMiddleware } from "@ai-sdk/devtools";
// TODO: Re-enable when @posthog/ai supports AI SDK v6 (LanguageModelV3)
// See: https://github.com/PostHog/posthog-js/issues/2522
// import { withTracing } from "@posthog/ai/vercel";
import type { Logger } from "@yoda.fun/logger";
import type { Environment } from "@yoda.fun/shared/services";
import type { LanguageModel as LanguageModelType } from "ai";

import {
  experimental_generateImage,
  generateObject,
  generateText,
  streamObject,
  streamText,
  wrapLanguageModel,
} from "ai";

// TODO: Re-enable @posthog/ai when it supports AI SDK v6
// import type { PostHog } from "posthog-node";
import { type AIModelConfig, getModel } from "./ai-providers";

export type LanguageModel = Exclude<LanguageModelType, string>;

export interface AiClientConfig {
  logger: Logger;
  providerConfigs: {
    googleGeminiApiKey?: string;
    anthropicApiKey?: string;
    groqApiKey?: string;
    xaiApiKey: string;
  };
  // TODO: Re-enable when @posthog/ai supports AI SDK v6
  // posthog?: PostHog;
  environment: Environment;
}

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

    // Wrap with devtools in dev environment
    // TODO: PostHog tracing disabled until @posthog/ai supports AI SDK v6
    // See: https://github.com/PostHog/posthog-js/issues/2522
    if (config.environment === "dev") {
      // Type assertion needed due to AI SDK v6 beta type mismatch
      // between LanguageModelV2 (providers) and LanguageModelV3 (wrapLanguageModel)
      return wrapLanguageModel({
        model: baseModel as Parameters<typeof wrapLanguageModel>[0]["model"],
        middleware: devToolsMiddleware(),
      });
    }

    return baseModel;
  },
  generateObject,
  streamObject,
  generateText,
  streamText,
  generateImage: experimental_generateImage,
  getProviderConfig: () => config.providerConfigs,
});

export interface AiClient {
  getProviderConfig: () => AiClientConfig["providerConfigs"];
  getModel: (aiConfig: AIModelConfig) => LanguageModel;
  generateObject: typeof generateObject;
  streamObject: typeof streamObject;
  generateText: typeof generateText;
  streamText: typeof streamText;
  generateImage: typeof experimental_generateImage;
}
