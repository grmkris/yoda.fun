import { StreamableHTTPTransport } from "@hono/mcp";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import { X402_CONFIG } from "@yoda.fun/shared/constants";
import type { Context } from "hono";
import { createMcpServer } from "./server";
import {
  FREE_TOOLS,
  getOrCreateAgentUser,
  parseX402Headers,
  TOOL_PRICES,
} from "./x402";

export interface McpTransportDeps {
  db: Database;
  logger: Logger;
}

/**
 * MCP discovery endpoint - browser-friendly JSON response
 * Returns server info, tools, and deposit tiers
 */
function getMcpDiscovery() {
  const tools = [
    ...Array.from(FREE_TOOLS).map((name) => ({
      name,
      description: getToolDescription(name),
      free: true,
    })),
    ...Object.entries(TOOL_PRICES).map(([name, price]) => ({
      name,
      description: getToolDescription(name),
      price: `$${price}`,
    })),
  ];

  return {
    name: "yoda-fun",
    version: "1.0.0",
    protocol: "mcp",
    transport: "streamable-http",
    documentation: "https://docs.yoda.fun/mcp",
    tools,
    deposit: {
      description: "Deposit USDC for points via x402 payment",
      endpoint: "/mcp/deposit/{tier}",
      tiers: [
        { usdc: 0.1, points: 1, route: "/mcp/deposit/0.1" },
        { usdc: 1, points: 10, route: "/mcp/deposit/1" },
        { usdc: 5, points: 55, route: "/mcp/deposit/5" },
        { usdc: 10, points: 120, route: "/mcp/deposit/10" },
      ],
      networks: [X402_CONFIG.evm.network, X402_CONFIG.solana.network],
    },
  };
}

function getToolDescription(name: string): string {
  const descriptions: Record<string, string> = {
    list_markets: "List active prediction markets",
    get_market: "Get details of a specific market",
    get_leaderboard: "View the leaderboard",
    get_profile: "Get user profile",
    place_bet: "Place a bet on a market (requires auth)",
    get_points: "Get your points balance (requires auth)",
    get_bet_history: "Get your betting history (requires auth)",
  };
  return descriptions[name] ?? name;
}

/**
 * Handle MCP request with request-scoped server
 * Supports:
 * - Browser discovery (GET without SSE accept header)
 * - MCP protocol (POST/GET with proper headers)
 * - x402 payment for user identification
 */
export async function handleMcpRequest(c: Context, deps: McpTransportDeps) {
  const { db, logger } = deps;

  // Browser discovery - return JSON when Accept doesn't include SSE
  const acceptHeader = c.req.header("Accept") ?? "";
  if (c.req.method === "GET" && !acceptHeader.includes("text/event-stream")) {
    return c.json(getMcpDiscovery());
  }

  // Check for x402 payment to get userId
  const paymentInfo = parseX402Headers(c.req.raw.headers);
  const userId = paymentInfo
    ? await getOrCreateAgentUser(db, logger, paymentInfo.walletAddress)
    : null;

  // Create request-scoped MCP server and transport
  const { server } = createMcpServer({ db, logger }, userId);
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined, // Stateless - no session persistence
    enableJsonResponse: true, // Return JSON instead of SSE for simpler client compatibility
  });

  await server.connect(transport);

  return transport.handleRequest(c);
}
