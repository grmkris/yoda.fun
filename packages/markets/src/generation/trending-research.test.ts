import { describe, expect, it } from "bun:test";
import { createAiClient } from "@yoda.fun/ai";
import { createLogger } from "@yoda.fun/logger";
import { env, write } from "bun";
import { z } from "zod";
import { getTrendingTopics } from "./trending-research";

const TestEnvSchema = z.object({
  EXA_API_KEY: z.string(),
  XAI_API_KEY: z.string(),
  GOOGLE_GEMINI_API_KEY: z.string(),
});

const testEnv = TestEnvSchema.parse(env);

describe("trendingResearch", () => {
  it("should return the trending research", async () => {
    const logger = createLogger({
      appName: "test",
      level: "error",
      environment: "dev",
    });
    const aiClient = createAiClient({
      logger,
      environment: "dev",
      providerConfigs: {
        xaiApiKey: testEnv.XAI_API_KEY,
        googleGeminiApiKey: testEnv.GOOGLE_GEMINI_API_KEY,
        exaApiKey: testEnv.EXA_API_KEY,
      },
    });
    const result = await getTrendingTopics({
      aiClient,
      logger,
      config: {
        topics: [
          {
            category: "sports",
            id: "sports",
            querySeeds: ["NBA games today tomorrow"],
          },
          {
            category: "movies",
            id: "movies",
            querySeeds: ["movies releasing this week"],
          },
        ],
        previousTopics: ["NBA games today tomorrow", "Taylor swift"],
      },
    });
    console.log(result);
    // write to file
    write("trending-research.json", JSON.stringify(result, null, 2));
    expect(result).toBeDefined();
  }, 180_000);
});
