import { StreamableHTTPTransport } from "@hono/mcp";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { Context } from "hono";
import { createMcpServer } from "./server";
import { getOrCreateAgentUser, parseX402Headers } from "./x402";

export interface McpTransportDeps {
  db: Database;
  logger: Logger;
}

/**
 * Handle MCP request with request-scoped server
 * Extracts userId from x402 payment headers if present
 */
export async function handleMcpRequest(c: Context, deps: McpTransportDeps) {
  const { db, logger } = deps;

  // Check for x402 payment to get userId
  const paymentInfo = parseX402Headers(c.req.raw.headers);
  const userId = paymentInfo
    ? await getOrCreateAgentUser(db, logger, paymentInfo.walletAddress)
    : null;

  // Create request-scoped MCP server
  const { server } = createMcpServer({ db, logger }, userId);

  // Create transport and connect
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(c);
  } finally {
    await server.close();
  }
}
