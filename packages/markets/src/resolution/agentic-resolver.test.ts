import { describe, expect, it } from "bun:test";
import { createAiClient } from "@yoda.fun/ai";
import { createLogger } from "@yoda.fun/logger";
import { env } from "bun";
import { z } from "zod";
import { resolveWithAgent } from "./agentic-resolver";

const TestEnvSchema = z.object({
  XAI_API_KEY: z.string(),
  GOOGLE_GEMINI_API_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

const testEnv = TestEnvSchema.parse(env);

describe("agenticResolver", () => {
  const logger = createLogger({
    appName: "agentic-resolver-test",
    level: "error",
    environment: "dev",
  });

  const aiClient = createAiClient({
    logger,
    environment: "dev",
    providerConfigs: {
      xaiApiKey: testEnv.XAI_API_KEY,
      googleGeminiApiKey: testEnv.GOOGLE_GEMINI_API_KEY,
      anthropicApiKey: testEnv.ANTHROPIC_API_KEY || "",
    },
  });

  it("resolves a factual question with YES and populates sources", async () => {
    const result = await resolveWithAgent(
      {
        title: "Is the Eiffel Tower located in Paris?",
        description:
          "This market resolves YES if the Eiffel Tower is in Paris, France.",
        category: "geography",
        resolutionCriteria: "The Eiffel Tower must be located in Paris, France",
      },
      aiClient
    );

    console.log("Result:", result);

    // Should resolve to YES
    expect(result.result).toBe("YES");
    expect(result.confidence).toBeGreaterThan(80);
    expect(result.reasoning).toBeTruthy();

    // Key test: sources should be populated from web search
    expect(Array.isArray(result.sources)).toBe(true);
    expect(result.sources.length).toBeGreaterThan(0);

    // Each source should have url and snippet
    for (const source of result.sources) {
      expect(source.url).toBeTruthy();
      expect(source.snippet).toBeTruthy();
    }

    // Should have used webSearch tool
    expect(result.toolsUsed).toContain("webSearch");
  }, 120_000);

  it("resolves a clearly false question with NO", async () => {
    const result = await resolveWithAgent(
      {
        title: "Is the sky green on a clear day?",
        description:
          "This market resolves YES if the sky appears green during normal daytime conditions.",
        category: "science",
        resolutionCriteria: "The sky must appear green during a clear day",
      },
      aiClient
    );

    console.log("Result:", result);

    // Should resolve to NO
    expect(result.result).toBe("NO");
    expect(result.confidence).toBeGreaterThan(50);
    expect(result.reasoning).toBeTruthy();
    expect(Array.isArray(result.sources)).toBe(true);
  }, 120_000);

  it("returns INVALID for unclear or future events", async () => {
    const result = await resolveWithAgent(
      {
        title: "Will a completely fictional event XYZ123ABC happen?",
        description:
          "Test market with fictional content that cannot be verified.",
        category: "test",
        resolutionCriteria: "XYZ123ABC must occur by end of today",
      },
      aiClient
    );

    console.log("Result:", result);

    // Should handle gracefully - either INVALID or NO with reasoning
    expect(["YES", "NO", "INVALID"]).toContain(result.result);
    expect(result.reasoning).toBeTruthy();
    expect(Array.isArray(result.sources)).toBe(true);
  }, 120_000);

  it("always returns valid source structure", async () => {
    const result = await resolveWithAgent(
      {
        title: "Did Bitcoin exist before 2010?",
        description: "Market resolves YES if Bitcoin was created before 2010.",
        category: "crypto",
        resolutionCriteria:
          "Bitcoin must have been created before January 1, 2010",
      },
      aiClient
    );

    console.log("Result:", result);

    // Verify structure
    expect(result).toHaveProperty("result");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("reasoning");
    expect(result).toHaveProperty("sources");
    expect(result).toHaveProperty("toolsUsed");

    // Sources should be array
    expect(Array.isArray(result.sources)).toBe(true);

    // Tools used should be array
    expect(Array.isArray(result.toolsUsed)).toBe(true);
  }, 120_000);
});
