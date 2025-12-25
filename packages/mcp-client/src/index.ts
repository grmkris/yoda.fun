#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseUnits } from "viem";
import { wrapFetchWithPayment } from "x402-fetch";
import { z } from "zod";
import { getOrCreateWallet, getWalletAddress } from "./wallet.js";

const YODA_API = process.env.YODA_API || "https://api.yoda.fun";
const MAX_PAYMENT = parseUnits("10", 6); // Max $10 USDC per request

// Initialize wallet
const wallet = getOrCreateWallet();

// Wrap fetch with x402 payment capability
const paidFetch = wrapFetchWithPayment(fetch, wallet, MAX_PAYMENT);

// Helper to proxy tool calls to yoda.fun server
async function proxyToServer(toolName: string, args: Record<string, unknown>) {
  const response = await paidFetch(`${YODA_API}/mcp/tools/${toolName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const error = await response.text();
    return { content: [{ type: "text" as const, text: `Error: ${error}` }], isError: true };
  }

  const result = await response.json();
  return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
}

// MCP Server
const server = new McpServer({
  name: "yoda-fun",
  version: "0.1.0",
});

// Register tools

server.registerTool(
  "list_markets",
  {
    description: "List active prediction markets on yoda.fun",
    inputSchema: {
      limit: z.number().optional(),
      category: z.string().optional(),
    },
  },
  async (args) => proxyToServer("list_markets", args)
);

server.registerTool(
  "get_market",
  {
    description: "Get details of a specific prediction market",
    inputSchema: {
      marketId: z.string(),
    },
  },
  async (args) => proxyToServer("get_market", args)
);

server.registerTool(
  "place_bet",
  {
    description: "Place a bet on a prediction market (requires x402 payment)",
    inputSchema: {
      marketId: z.string(),
      vote: z.enum(["YES", "NO"]),
      amount: z.number().optional(),
    },
  },
  async (args) => proxyToServer("place_bet", args)
);

server.registerTool(
  "get_balance",
  {
    description: "Get your current yoda.fun balance (requires x402 payment)",
  },
  async () => proxyToServer("get_balance", {})
);

server.registerTool(
  "get_bet_history",
  {
    description: "Get your betting history (requires x402 payment)",
    inputSchema: {
      limit: z.number().optional(),
      status: z.enum(["ACTIVE", "WON", "LOST", "REFUNDED"]).optional(),
    },
  },
  async (args) => proxyToServer("get_bet_history", args)
);

server.registerTool(
  "get_leaderboard",
  {
    description: "View the yoda.fun leaderboard",
    inputSchema: {
      period: z.enum(["daily", "weekly", "monthly", "allTime"]).optional(),
      metric: z.enum(["profit", "winRate", "streak"]).optional(),
      limit: z.number().optional(),
    },
  },
  async (args) => proxyToServer("get_leaderboard", args)
);

server.registerTool(
  "get_wallet_info",
  {
    description: "Get your agent wallet address and USDC balance",
  },
  async () => {
    const address = getWalletAddress();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              address,
              network: "Base",
              token: "USDC",
              note: "Fund this address with USDC on Base to place bets",
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("yoda.fun MCP client started");
}

main().catch(console.error);
