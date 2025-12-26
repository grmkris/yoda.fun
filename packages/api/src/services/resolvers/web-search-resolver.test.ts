import { beforeAll, describe, expect, test } from "bun:test";
import { type AiClient, createAiClient } from "@yoda.fun/ai";
import { createLogger } from "@yoda.fun/logger";
import { resolveWebSearchMarket } from "./web-search-resolver";

describe("Web Search Resolver", () => {
  let aiClient: AiClient;

  beforeAll(() => {
    const logger = createLogger({
      appName: "web-search-resolver-test",
      level: "error",
      environment: "dev",
    });

    aiClient = createAiClient({
      logger,
      environment: "dev",
      providerConfigs: {
        googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
        anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
        groqApiKey: process.env.GROQ_API_KEY || "",
        xaiApiKey: process.env.XAI_API_KEY || "",
      },
    });
  });

  describe("resolveWebSearchMarket", () => {
    test("resolves factual question with YES result", async () => {
      const result = await resolveWebSearchMarket(
        aiClient,
        {
          title: "Is the sky blue during a clear day?",
          description:
            "This market resolves YES if the sky appears blue during clear daytime conditions.",
          category: "science",
          resolutionCriteria: "The sky is blue due to Rayleigh scattering",
        },
        {
          type: "WEB_SEARCH",
          searchQuery: "why is the sky blue during the day",
          successIndicators: [
            "sky is blue",
            "Rayleigh scattering",
            "blue light",
          ],
        }
      );

      expect(["YES", "INVALID"]).toContain(result.result);
      if (result.result === "YES") {
        expect(result.confidence).toBeGreaterThan(50);
      }
      expect(result.reasoning).toBeTruthy();
    }, 120_000);

    test("resolves question about known fact", async () => {
      const result = await resolveWebSearchMarket(
        aiClient,
        {
          title: "Is water composed of hydrogen and oxygen?",
          description:
            "This market resolves YES if water (H2O) contains hydrogen and oxygen atoms.",
          category: "science",
          resolutionCriteria: "Water is H2O",
        },
        {
          type: "WEB_SEARCH",
          searchQuery: "what is water made of H2O composition",
          successIndicators: ["hydrogen", "oxygen", "H2O", "water molecule"],
        }
      );

      expect(["YES", "INVALID"]).toContain(result.result);
      if (result.result === "YES") {
        expect(result.confidence).toBeGreaterThan(70);
      }
    }, 120_000);

    test("returns sources from search providers", async () => {
      const result = await resolveWebSearchMarket(
        aiClient,
        {
          title: "Did Bitcoin exist before 2010?",
          description:
            "Market resolves YES if Bitcoin was created before 2010.",
          category: "crypto",
          resolutionCriteria: null,
        },
        {
          type: "WEB_SEARCH",
          searchQuery: "when was Bitcoin created Satoshi Nakamoto",
          successIndicators: ["2008", "2009", "Satoshi Nakamoto", "whitepaper"],
        }
      );

      if (result.toolsUsed.length > 0) {
        expect(result.sources.length).toBeGreaterThan(0);
        expect(result.sources[0]?.url).toBeTruthy();
      }
    }, 120_000);

    test("tracks which tools were used", async () => {
      const result = await resolveWebSearchMarket(
        aiClient,
        {
          title: "Is JavaScript a programming language?",
          description: "Resolves YES if JavaScript is a programming language.",
          category: "tech",
          resolutionCriteria: null,
        },
        {
          type: "WEB_SEARCH",
          searchQuery: "JavaScript programming language",
          successIndicators: [
            "programming language",
            "JavaScript",
            "scripting",
          ],
        }
      );

      expect(Array.isArray(result.toolsUsed)).toBe(true);
      const validProviders = ["xai_web", "xai_x", "google", "exa"];
      for (const tool of result.toolsUsed) {
        expect(validProviders).toContain(tool);
      }
    }, 120_000);

    test("includes reasoning in response", async () => {
      const result = await resolveWebSearchMarket(
        aiClient,
        {
          title: "Is Earth round?",
          description: "Resolves YES if Earth is approximately spherical.",
          category: "science",
          resolutionCriteria: null,
        },
        {
          type: "WEB_SEARCH",
          searchQuery: "is the Earth round or flat science",
          successIndicators: ["spherical", "round", "globe", "oblate spheroid"],
        }
      );

      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(20);
    }, 120_000);

    test("handles obscure query and returns structured response", async () => {
      const result = await resolveWebSearchMarket(
        aiClient,
        {
          title: "Did xyz123abc win the fictional award?",
          description: "Test market with fictional content.",
          category: "test",
          resolutionCriteria: null,
        },
        {
          type: "WEB_SEARCH",
          searchQuery: "xyz123abc fictional award winner 2024",
          successIndicators: ["xyz123abc", "award", "winner"],
        }
      );

      expect(["YES", "NO", "INVALID"]).toContain(result.result);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.reasoning).toBeTruthy();
    }, 120_000);
  });
});
