import { devToolsMiddleware } from "@ai-sdk/devtools";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { Environment } from "@yoda.fun/shared/services";
import type { LanguageModel as LanguageModelType } from "ai";
import { generateImage, generateText, streamText, wrapLanguageModel } from "ai";
import Exa from "exa-js";

import { type AIModelConfig, getModel } from "./ai-providers";
import { wrapGenerateText } from "./observability";

export type LanguageModel = Exclude<LanguageModelType, string>;

export interface AiClientConfig {
  logger: Logger;
  providerConfigs: {
    googleGeminiApiKey?: string;
    anthropicApiKey?: string;
    groqApiKey?: string;
    xaiApiKey: string;
    exaApiKey?: string;
  };
  environment: Environment;
  /** Optional: Pass database to enable AI observability logging */
  db?: Database;
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

export const createAiClient = (config: AiClientConfig): AiClient => {
  // Create provider instances for tools access
  const xaiProvider = createXai({ apiKey: config.providerConfigs.xaiApiKey });
  const googleProvider = config.providerConfigs.googleGeminiApiKey
    ? createGoogleGenerativeAI({
        apiKey: config.providerConfigs.googleGeminiApiKey,
      })
    : null;

  return {
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

    // xAI Responses API model (for server-side tools)
    getXaiResponsesModel: (modelId: string) => {
      return xaiProvider.responses(modelId);
    },

    // xAI provider tools
    getXaiTools: () => ({
      webSearch: xaiProvider.tools.webSearch,
      xSearch: xaiProvider.tools.xSearch,
      codeExecution: xaiProvider.tools.codeExecution,
    }),

    // Google provider tools
    getGoogleTools: () => {
      if (!googleProvider) {
        throw new Error("Google Gemini API key is required for Google tools");
      }
      return {
        googleSearch: googleProvider.tools.googleSearch,
      };
    },

    // Google model getter (for search grounding)
    getGoogleModel: (modelId: string) => {
      if (!googleProvider) {
        throw new Error("Google Gemini API key is required");
      }
      return googleProvider(modelId);
    },

    searchWithExa: async (query: string) => {
      if (!config.providerConfigs.exaApiKey) {
        throw new Error("Exa API key is required for searchWithExa");
      }
      const exa = new Exa(config.providerConfigs.exaApiKey);
      const response = await exa.getContents(query, {
        numResults: 5,
        text: { maxCharacters: 500 },
      });
      type ExaResult = (typeof response.results)[number];
      return {
        text: response.results.map((r: ExaResult) => r.text ?? "").join("\n\n"),
        sources: response.results.map((r: ExaResult) => ({
          url: r.url,
          title: r.title ?? "Exa result",
          snippet: r.text?.slice(0, 200) ?? "",
        })),
      };
    },
    generateText: config.db
      ? wrapGenerateText(generateText, config.db, config.logger)
      : generateText,
    streamText,
    generateImage,
    getProviderConfig: () => config.providerConfigs,
  };
};

// Types for provider-specific tools
type XaiProvider = ReturnType<typeof createXai>;
type GoogleProvider = ReturnType<typeof createGoogleGenerativeAI>;

export interface XaiTools {
  webSearch: XaiProvider["tools"]["webSearch"];
  xSearch: XaiProvider["tools"]["xSearch"];
  codeExecution: XaiProvider["tools"]["codeExecution"];
}

export interface GoogleTools {
  googleSearch: GoogleProvider["tools"]["googleSearch"];
}

export interface ExaSearchResult {
  url: string;
  title: string;
  snippet: string;
}

export interface AiClient {
  getProviderConfig: () => AiClientConfig["providerConfigs"];
  getModel: (aiConfig: AIModelConfig) => LanguageModel;
  // xAI Responses API (for server-side tools like web_search, x_search)
  getXaiResponsesModel: (
    modelId: string
  ) => ReturnType<XaiProvider["responses"]>;
  // Provider-specific tools
  getXaiTools: () => XaiTools;
  getGoogleTools: () => GoogleTools;
  getGoogleModel: (modelId: string) => ReturnType<GoogleProvider>;
  searchWithExa: (
    query: string
  ) => Promise<{ text: string; sources: ExaSearchResult[] }>;
  // AI SDK methods
  generateText: typeof generateText;
  streamText: typeof streamText;
  generateImage: typeof generateImage;
}
