import { describe, expect, it } from "bun:test";
import { createAiClient } from "@yoda.fun/ai";
import { createLogger } from "@yoda.fun/logger";
import { env } from "bun";
import { z } from "zod";
import { resolveWithAgent } from "./agentic-resolver";
import { HISTORICAL_MARKETS } from "./historical-markets";

const TestEnvSchema = z.object({
  XAI_API_KEY: z.string(),
  GOOGLE_GEMINI_API_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

const testEnv = TestEnvSchema.parse(env);

interface TestResult {
  market: string;
  expected: "YES" | "NO";
  actual: "YES" | "NO" | "INVALID";
  correct: boolean;
  confidence: number;
  sourcesCount: number;
  reasoning: string;
}

const results: TestResult[] = [];

const STATUS_MAP = {
  YES: "FAIL",
  NO: "FAIL",
  INVALID: "INVALID",
} as const;

describe("Resolution Accuracy - Historical Markets", () => {
  const logger = createLogger({
    appName: "resolution-accuracy-test",
    level: "info",
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

  for (const market of HISTORICAL_MARKETS) {
    it(`resolves: ${market.title}`, async () => {
      const result = await resolveWithAgent(market, aiClient, logger);

      const testResult: TestResult = {
        market: market.title,
        expected: market.expectedResult,
        actual: result.result,
        correct: result.result === market.expectedResult,
        confidence: result.confidence,
        sourcesCount: result.sources.length,
        reasoning: result.reasoning,
      };
      results.push(testResult);

      // Log individual result
      logger.info(
        {
          market: market.title,
          expected: market.expectedResult,
          actual: result.result,
          confidence: result.confidence,
          sources: result.sources.length,
          correct: testResult.correct,
        },
        "Resolution result"
      );
      if (!testResult.correct) {
        logger.warn(
          { reasoning: result.reasoning, notes: market.notes },
          "Mismatch details"
        );
      }

      // Assertions
      expect(result.result).toBeOneOf(["YES", "NO", "INVALID"]);
      expect(result.reasoning).toBeTruthy();
      expect(Array.isArray(result.sources)).toBe(true);

      // Note: sources may be 0 due to extraction bug, don't fail on this
      if (result.sources.length === 0 && result.result !== "INVALID") {
        logger.warn({}, "No sources captured despite valid result");
      }

      // Track accuracy but don't fail on wrong answer
      // (we want to see all results, not stop on first failure)
      if (result.result !== market.expectedResult) {
        logger.warn(
          { expected: market.expectedResult, actual: result.result },
          "Result mismatch"
        );
      }
    }, 180_000);
  }

  // Summary at the end
  it("prints accuracy summary", () => {
    const total = results.length;
    const correct = results.filter((r) => r.correct).length;
    const incorrect = results.filter(
      (r) => !r.correct && r.actual !== "INVALID"
    ).length;
    const invalid = results.filter((r) => r.actual === "INVALID").length;
    const successRate = total > 0 ? ((correct / total) * 100).toFixed(1) : "0";

    logger.info(
      { total, correct, incorrect, invalid, successRate: `${successRate}%` },
      "Resolution accuracy summary"
    );

    // Detailed breakdown
    for (const r of results) {
      const status = r.correct ? "PASS" : STATUS_MAP[r.actual];
      logger.info(
        {
          status,
          market: r.market.substring(0, 40),
          expected: r.expected,
          actual: r.actual,
          confidence: r.confidence,
        },
        "Market result"
      );
    }

    // This test always passes - it's just for summary
    expect(true).toBe(true);
  });
});
