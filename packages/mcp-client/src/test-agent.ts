#!/usr/bin/env node
/**
 * MCP Agent Test
 *
 * Connects to the yoda.fun MCP server and runs an AI agent
 * that can use the available tools.
 *
 * Usage:
 *   bun run packages/mcp-client/src/test-agent.ts
 *
 * Environment:
 *   YODA_API - MCP server URL (default: http://localhost:4200/mcp)
 *   XAI_API_KEY - xAI API key for the agent
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = process.env.YODA_API || "http://localhost:4200/mcp";

async function main() {
  console.log("Connecting to MCP server:", MCP_URL);

  // Create transport
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));

  // Create client
  const client = new Client({
    name: "yoda-test-agent",
    version: "1.0.0",
  });

  // Connect
  await client.connect(transport);
  console.log("Connected!");

  // List tools
  const { tools } = await client.listTools();
  console.log("\nAvailable tools:");
  for (const tool of tools) {
    console.log(`  - ${tool.name}: ${tool.description}`);
  }

  // Test list_markets
  console.log("\nCalling list_markets...");
  const result = await client.callTool({
    name: "list_markets",
    arguments: { limit: 3 },
  });
  console.log("Result:", JSON.stringify(result, null, 2));

  // Close
  await client.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
