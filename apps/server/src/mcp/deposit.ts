import { createFacilitatorConfig } from "@coinbase/x402";
import {
  HTTPFacilitatorClient,
  type RoutesConfig,
  x402ResourceServer,
} from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware } from "@x402/hono";
import { registerExactSvmScheme } from "@x402/svm/exact/server";
import { createPointsService } from "@yoda.fun/api/services/points-service";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import { X402_CONFIG } from "@yoda.fun/shared/constants";
import type { Environment } from "@yoda.fun/shared/services";
import { Hono } from "hono";

import { env } from "../env";
import { x402BodyCompat } from "../middleware/x402-compat";
import { getOrCreateAgentUser, parseX402Headers } from "./x402";

interface McpDepositRouteDeps {
  db: Database;
  logger: Logger;
  appEnv: Environment;
}

const DEPOSIT_TIERS = [
  { usdc: 0.1, points: 1 },
  { usdc: 1, points: 10 },
  { usdc: 5, points: 55 },
  { usdc: 10, points: 120 },
] as const;

function buildRouteConfig(): RoutesConfig {
  const config: RoutesConfig = {};

  for (const tier of DEPOSIT_TIERS) {
    const priceFormatted = `$${tier.usdc.toFixed(2)}`;
    config[`POST /mcp/deposit/${tier.usdc}`] = {
      accepts: [
        {
          scheme: "exact",
          price: priceFormatted,
          network: X402_CONFIG.evm.network,
          payTo: X402_CONFIG.evm.depositWallet,
        },
        {
          scheme: "exact",
          price: priceFormatted,
          network: X402_CONFIG.solana.network,
          payTo: X402_CONFIG.solana.depositWallet,
        },
      ],
      description: `Agent deposit $${tier.usdc} for ${tier.points} points`,
      mimeType: "application/json",
    };
  }

  return config;
}

/**
 * Create MCP deposit routes for AI agents
 * Uses x402 payment to identify agent by wallet address
 * Agents continue to use x402 for subsequent tool calls (identity by wallet)
 */
export function createMcpDepositRoutes(deps: McpDepositRouteDeps) {
  const { db, logger, appEnv } = deps;
  const app = new Hono();

  const pointsService = createPointsService({ deps: { db, logger } });

  // Create x402 v2 server with EVM + Solana schemes
  const facilitatorConfig = createFacilitatorConfig(
    env.CDP_API_KEY_ID,
    env.CDP_API_KEY_SECRET
  );
  const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);

  const x402Server = new x402ResourceServer(facilitatorClient);
  registerExactEvmScheme(x402Server);
  registerExactSvmScheme(x402Server);

  const routeConfig = buildRouteConfig();

  // Apply x402 middleware
  app.use("/deposit/*", x402BodyCompat());
  app.use("/deposit/*", paymentMiddleware(routeConfig, x402Server));

  // List available deposit tiers (no auth required)
  app.get("/deposit/tiers", (c) =>
    c.json({
      tiers: DEPOSIT_TIERS.map((tier) => ({
        usdc: tier.usdc,
        points: tier.points,
        route: `/mcp/deposit/${tier.usdc}`,
      })),
      networks: [X402_CONFIG.evm.network, X402_CONFIG.solana.network],
    })
  );

  // Agent deposit handlers - uses wallet from x402 payment
  for (const tier of DEPOSIT_TIERS) {
    app.post(`/deposit/${tier.usdc}`, async (c) => {
      // Extract wallet from x402 payment (NOT session)
      const paymentInfo = parseX402Headers(c.req.raw.headers);
      if (!paymentInfo) {
        return c.json({ error: "x402 payment required" }, 401);
      }

      // Get or create agent user by wallet
      const userId = await getOrCreateAgentUser(
        db,
        logger,
        paymentInfo.walletAddress
      );

      const paymentResponse = c.req.header("X-PAYMENT-RESPONSE");

      try {
        const result = await pointsService.creditPoints(
          userId,
          tier.points,
          "POINT_PURCHASE",
          {
            x402PaymentResponse: paymentResponse,
            usdcAmount: tier.usdc.toString(),
            source: "mcp_agent",
          }
        );

        logger.info(
          {
            userId,
            wallet: paymentInfo.walletAddress,
            usdc: tier.usdc,
            points: tier.points,
            transactionId: result.transaction?.id,
          },
          "Agent deposit completed"
        );

        return c.json({
          success: true,
          usdc: tier.usdc,
          points: tier.points,
          newBalance: result.balance?.points,
          transactionId: result.transaction?.id,
          wallet: paymentInfo.walletAddress,
          // Agent continues to use x402 for subsequent requests
          // The wallet address identifies the user
          auth_method: "x402",
          message: "Use x402 payment header for subsequent tool calls",
        });
      } catch (error) {
        logger.error(
          { error, wallet: paymentInfo.walletAddress, tier },
          "Agent deposit failed"
        );
        return c.json({ error: "Deposit failed" }, 500);
      }
    });
  }

  // Dev-only deposit endpoint (bypasses x402 payment for testing)
  if (appEnv === "dev") {
    app.post("/deposit/dev/:usdc", async (c) => {
      const usdcStr = c.req.param("usdc");
      const usdc = Number(usdcStr);

      const tier = DEPOSIT_TIERS.find((t) => t.usdc === usdc);
      if (!tier) {
        return c.json({ error: "Invalid tier" }, 400);
      }

      // Use a test wallet for dev mode
      const testWallet = "0x1234567890123456789012345678901234567890";
      const userId = await getOrCreateAgentUser(db, logger, testWallet);

      const result = await pointsService.creditPoints(
        userId,
        tier.points,
        "POINT_PURCHASE",
        {
          reason: "dev_agent_deposit",
          usdcAmount: tier.usdc.toString(),
          source: "mcp_agent_dev",
        }
      );

      logger.info(
        { userId, wallet: testWallet, usdc: tier.usdc, points: tier.points },
        "Dev agent deposit completed"
      );

      return c.json({
        success: true,
        usdc: tier.usdc,
        points: tier.points,
        newBalance: result.balance?.points,
        wallet: testWallet,
        userId,
        auth_method: "x402",
        message: "Use x402 payment header for subsequent tool calls",
      });
    });
  }

  return app;
}
