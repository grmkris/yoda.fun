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

describe("agenticResolver - Real Markets", () => {
  const logger = createLogger({
    appName: "agentic-resolver-test",
    level: "debug",
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

  // Real market from production - resolved YES
  it("resolves NFL upset market", async () => {
    const result = await resolveWithAgent(
      {
        title: "Sun NFL: 7+ dogs feast or chalk szn?",
        description:
          "Dec 29 NFL slate loaded w/ big spreads - any 7+ pt underdog win outright or faves bully thru?",
        category: "sports",
        resolutionCriteria:
          "Resolves YES if at least one NFL team favored by 7+ points (per opening Vegas consensus lines on ESPN Bet or OddsShark) loses outright on December 29, 2025, confirmed by final scores on NFL.com.",
        createdAt: new Date("2025-12-28"),
        votingEndsAt: new Date("2025-12-29T17:00:00Z"),
        resolutionDeadline: new Date("2025-12-30"),
      },
      aiClient,
      logger
    );

    // Verify structure
    expect(result.result).toBeOneOf(["YES", "NO", "INVALID"]);
    expect(result.reasoning).toBeTruthy();
    expect(Array.isArray(result.sources)).toBe(true);

    // Key: sources should be populated from web search
    if (result.result !== "INVALID") {
      expect(result.sources.length).toBeGreaterThan(0);
    }
  }, 120_000);

  // Real market - Globe Soccer Awards (Mbappé)
  it("resolves Globe Soccer Award market", async () => {
    const result = await resolveWithAgent(
      {
        title: "Mbappé Best Men's Globe tonight or Yamal dethrones?",
        description:
          "Globe Soccer Awards hitting tonight - Kylian the new GOAT or Lamine Yamal shocks?",
        category: "sports",
        resolutionCriteria:
          "Resolves YES if Kylian Mbappé wins the Best Men's Player award at the 2025 Globe Soccer Awards on December 28, 2025, per the official Globe Soccer website or event announcement.",
        createdAt: new Date("2025-12-27"),
        votingEndsAt: new Date("2025-12-28T20:00:00Z"),
        resolutionDeadline: new Date("2025-12-29"),
      },
      aiClient,
      logger
    );

    expect(result.result).toBeOneOf(["YES", "NO", "INVALID"]);
    expect(result.reasoning).toBeTruthy();
    expect(Array.isArray(result.sources)).toBe(true);
  }, 120_000);

  // Weather market - Great Lakes snow
  it("resolves Great Lakes snow market", async () => {
    const result = await resolveWithAgent(
      {
        title: "Great Lakes 15+ snow dump by Dec30 or flake szn?",
        description:
          "Massive winter storm barreling toward Great Lakes - will any spot officially log 15+ inches?",
        category: "weather",
        resolutionCriteria:
          "Resolves YES if any location in the Great Lakes region officially reports over 15 inches of snowfall from the current winter storm (per NWS or official weather stations) by December 30, 2025.",
        createdAt: new Date("2025-12-27"),
        votingEndsAt: new Date("2025-12-29T23:59:00Z"),
        resolutionDeadline: new Date("2025-12-30"),
      },
      aiClient,
      logger
    );

    console.log("Weather Result:", JSON.stringify(result, null, 2));

    expect(result.result).toBeOneOf(["YES", "NO", "INVALID"]);
    expect(result.reasoning).toBeTruthy();
    expect(Array.isArray(result.sources)).toBe(true);
  }, 120_000);

  // Politics market - Guinea election
  it("resolves Guinea election market", async () => {
    const result = await resolveWithAgent(
      {
        title: "Doumbouya junta prez lock by Dec30 or Guinea chaos?",
        description:
          "Post-coup election results dropping - does Gen. Mamadi Doumbouya officially snag Guinea presidency?",
        category: "politics",
        resolutionCriteria:
          "Resolves YES if Gen. Mamadi Doumbouya is officially declared the winner of Guinea's 2025 presidential election by December 30, 2025, per national election commission.",
        createdAt: new Date("2025-12-26"),
        votingEndsAt: new Date("2025-12-29T23:59:00Z"),
        resolutionDeadline: new Date("2025-12-30"),
      },
      aiClient,
      logger
    );

    console.log("Politics Result:", JSON.stringify(result, null, 2));

    expect(result.result).toBeOneOf(["YES", "NO", "INVALID"]);
    expect(result.reasoning).toBeTruthy();
    expect(Array.isArray(result.sources)).toBe(true);
  }, 120_000);

  // Crypto market - BTC price (critical: previously hallucinated $126k)
  it("resolves Bitcoin price market", async () => {
    const result = await resolveWithAgent(
      {
        title: "BTC smashes $110k before NYE or bullrun ngmi fr?",
        description:
          "Santa rally pumping - does Bitcoin blast past $110k on CoinGecko before 2026?",
        category: "crypto",
        resolutionCriteria:
          "Resolves YES if Bitcoin price exceeds $110,000 USD on CoinGecko at any point before December 31, 2025, 23:59 UTC.",
        // Market created Dec 20, only evaluate Dec 20-31 price data
        createdAt: new Date("2025-12-20"),
        votingEndsAt: new Date("2025-12-30T23:59:00Z"),
        resolutionDeadline: new Date("2025-12-31"),
      },
      aiClient,
      logger
    );

    console.log("Crypto Result:", JSON.stringify(result, null, 2));

    expect(result.result).toBeOneOf(["YES", "NO", "INVALID"]);
    expect(result.reasoning).toBeTruthy();
    expect(Array.isArray(result.sources)).toBe(true);

    // Crypto prices should always be findable
    expect(result.sources.length).toBeGreaterThan(0);
  }, 120_000);
});
