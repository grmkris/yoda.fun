import type { AIModelConfig } from "./ai-providers";

export const MODELS = {
  XAI_GROK_4_LATEST: {
    provider: "xai",
    modelId: "grok-4-latest",
  } as const satisfies AIModelConfig,

  XAI_GROK_4_1_FAST_REASONING: {
    provider: "xai",
    modelId: "grok-4-1-fast-reasoning",
  } as const satisfies AIModelConfig,

  GOOGLE_GEMINI_2_5_FLASH_THINKING: {
    provider: "google",
    modelId: "gemini-flash-latest",
  } as const satisfies AIModelConfig,
} as const;
