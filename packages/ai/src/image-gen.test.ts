import { describe, expect, it } from "bun:test";
import { createLogger } from "@yoda.fun/logger";
import { env as testEnv, write } from "bun";
import z from "zod";
import { createAiClient } from "./ai-client";
import {
  fetchImageBuffer,
  generateImagePromptWithTags,
  generateMarketImageWithPrompt,
  type ImageModel,
} from "./image-generation";

const testEnvSchema = z.object({
  REPLICATE_API_KEY: z.string().optional(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
});

const env = testEnvSchema.parse(testEnv);

const TEST_MARKETS = [
  {
    title: "Will Bitcoin hit $150k in 2025?",
    description: "Bitcoin price prediction for the year",
    category: "crypto",
  },
  {
    title: "Lakers vs Celtics - Who wins tonight?",
    description: "NBA matchup prediction",
    category: "sports",
  },
];

const MODELS: ImageModel[] = [
  "google/nano-banana",
  "black-forest-labs/flux-schnell",
];

const canRunFullPipeline =
  !!env.REPLICATE_API_KEY && !!env.GOOGLE_GEMINI_API_KEY && !!env.XAI_API_KEY;

describe.if(canRunFullPipeline)("image generation - full pipeline", () => {
  it("generate prompts with AI then generate images", async () => {
    if (
      !(env.REPLICATE_API_KEY && env.GOOGLE_GEMINI_API_KEY && env.XAI_API_KEY)
    ) {
      throw new Error("Missing API keys");
    }

    const logger = createLogger({ appName: "image-gen-test", level: "silent" });
    const aiClient = createAiClient({
      logger,
      providerConfigs: {
        googleGeminiApiKey: env.GOOGLE_GEMINI_API_KEY,
        xaiApiKey: env.XAI_API_KEY,
      },
      environment: "dev",
    });

    for (const market of TEST_MARKETS) {
      // Step 1: Generate prompt with AI
      console.log(`\n--- ${market.title} ---`);
      const { prompt, tags, reuseOk } = await generateImagePromptWithTags(
        market,
        aiClient
      );
      console.log(`AI Prompt: ${prompt}`);
      console.log(`Tags: ${tags.join(", ")}, ReuseOk: ${reuseOk}`);

      // Step 2: Generate images with each model
      for (const model of MODELS) {
        console.log(`Generating: ${model}`);
        const url = await generateMarketImageWithPrompt(prompt, {
          replicateApiKey: env.REPLICATE_API_KEY,
          model,
        });
        expect(url).toBeDefined();

        const buffer = await fetchImageBuffer(url);
        expect(buffer.length).toBeGreaterThan(0);

        const slug = market.title
          .slice(0, 20)
          .replace(/\W+/g, "-")
          .toLowerCase();
        const modelSlug = model.split("/")[1];
        const filename = `test-${modelSlug}-${slug}.webp`;
        await write(filename, buffer);
        console.log(`Saved: ${filename} (${buffer.length} bytes)`);
      }
    }
  }, 300_000);
});
