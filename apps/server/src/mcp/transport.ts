import { StreamableHTTPTransport } from "@hono/mcp";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { Context } from "hono";
import { createMcpServer } from "./server";

export interface McpTransportDeps {
  db: Database;
  logger: Logger;
}

function getMcpDiscovery() {
  return {
    name: "yoda-fun",
    version: "1.0.0",
    protocol: "mcp",
    transport: "streamable-http",
    documentation: "https://docs.yoda.fun/mcp",
    tools: [
      { name: "list_markets", description: "List active prediction markets" },
      { name: "get_market", description: "Get details of a specific market" },
      { name: "get_leaderboard", description: "View the leaderboard" },
      { name: "get_profile", description: "Get user profile" },
      { name: "get_bet_history", description: "Get your betting history" },
    ],
  };
}

export async function handleMcpRequest(c: Context, deps: McpTransportDeps) {
  // Browser discovery
  const acceptHeader = c.req.header("Accept") ?? "";
  if (c.req.method === "GET" && !acceptHeader.includes("text/event-stream")) {
    return c.json(getMcpDiscovery());
  }

  const { server } = createMcpServer(deps, null);
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  return transport.handleRequest(c);
}
