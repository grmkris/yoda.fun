#!/usr/bin/env node
/**
 * AI Agent Test with MCP Tools
 *
 * Uses @ai-sdk/mcp to connect an LLM to our MCP server.
 * The LLM can discover and call tools autonomously.
 *
 * Usage:
 *   bun run packages/mcp-client/src/test-ai-agent.ts
 *
 * Environment:
 *   ENVIRONMENT - dev or prod (default: dev)
 *   XAI_API_KEY - xAI API key for the agent
 *   GOOGLE_GEMINI_API_KEY - Google Gemini API key
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMCPClient } from "@ai-sdk/mcp";
import { createXai } from "@ai-sdk/xai";
import { createLogger } from "@yoda.fun/logger";
import { Environment, SERVICE_URLS } from "@yoda.fun/shared/services.schema";
import { generateText } from "ai";
import { z } from "zod";

const TestEnvSchema = z.object({
  XAI_API_KEY: z.string(),
  GOOGLE_GEMINI_API_KEY: z.string(),
  ENVIRONMENT: Environment.default("dev"),
});

const env = TestEnvSchema.parse(process.env);
const mcpUrl = `${SERVICE_URLS[env.ENVIRONMENT].apiInternal}/mcp`;

const logger = createLogger({
  appName: "mcp-test-agent",
  level: "debug",
  environment: "dev",
});

async function main() {
  logger.info({ url: mcpUrl }, "Connecting to MCP server");

  // Create MCP client with HTTP transport
  const mcpClient = await createMCPClient({
    transport: {
      type: "http",
      url: mcpUrl,
    },
  });

  // Get tools from MCP server
  const tools = await mcpClient.tools();
  logger.info({ tools: Object.keys(tools) }, "Available tools");

  // Create model - prefer Gemini for better tool handling, fallback to xAI
  const model = env.GOOGLE_GEMINI_API_KEY
    ? createGoogleGenerativeAI({ apiKey: env.GOOGLE_GEMINI_API_KEY })(
        "gemini-2.0-flash"
      )
    : createXai({ apiKey: env.XAI_API_KEY })("grok-3-mini");

  logger.info({ modelId: model.modelId }, "Using model");

  logger.info("Asking agent to explore prediction markets...");

  try {
    const result = await generateText({
      model,
      tools,
      maxSteps: 10,
      maxTokens: 2048,
      toolChoice: "auto",
      system:
        "You are a prediction market analyst. After calling a tool and receiving results, you MUST analyze the data and provide your recommendation. Never stop after just calling a tool.",
      prompt:
        "Call list_markets to get available prediction markets. After receiving the markets, analyze them and recommend which one is most interesting based on topic, timing, and betting opportunity.",
    });

    logger.info({ finishReason: result.finishReason }, "Agent finished");
    logger.info({ response: result.text }, "Agent response");

    // Log detailed step info
    logger.debug({ stepCount: result.steps.length }, "Steps completed");
    for (const [i, step] of result.steps.entries()) {
      if (step.toolCalls.length > 0) {
        for (const call of step.toolCalls) {
          logger.debug(
            { step: i + 1, tool: call.toolName, args: call.args },
            "Tool call"
          );
        }
      }
      if (step.toolResults.length > 0) {
        for (const res of step.toolResults) {
          logger.debug(
            {
              step: i + 1,
              type: res.type,
              output: JSON.stringify(res.output).slice(0, 500),
            },
            "Tool result"
          );
        }
      }
      if (step.text) {
        logger.debug(
          { step: i + 1, text: step.text.slice(0, 200) },
          "Step text"
        );
      }
    }
  } finally {
    await mcpClient.close();
  }

  logger.info("Done");
}

main().catch((err) => {
  logger.error({ error: err }, "Error");
  process.exit(1);
});
