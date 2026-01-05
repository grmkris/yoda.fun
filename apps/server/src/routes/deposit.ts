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
import type { Auth } from "@yoda.fun/auth";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import { X402_CONFIG } from "@yoda.fun/shared/constants";
import type { Environment } from "@yoda.fun/shared/services";
import { UserId } from "@yoda.fun/shared/typeid";
import { Hono } from "hono";

import { env } from "../env";
import { x402BodyCompat } from "../middleware/x402-compat";

interface DepositRouteDeps {
  db: Database;
  auth: Auth;
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
    config[`POST /api/deposit/${tier.usdc}`] = {
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
      description: `Deposit $${tier.usdc} for ${tier.points} points`,
      mimeType: "application/json",
    };
  }

  return config;
}

export function createDepositRoutes(deps: DepositRouteDeps) {
  const { db, auth, logger, appEnv } = deps;
  const app = new Hono();

  const pointsService = createPointsService({ deps: { db, logger } });

  // Create x402 v2 server with EVM + Solana schemes (CDP auth)
  const facilitatorConfig = createFacilitatorConfig(
    env.CDP_API_KEY_ID,
    env.CDP_API_KEY_SECRET
  );
  const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);

  const server = new x402ResourceServer(facilitatorClient);
  registerExactEvmScheme(server);
  registerExactSvmScheme(server);

  const routeConfig = buildRouteConfig();

  // Apply x402 compat middleware (copies header to body for v1 clients)

  // Apply x402 payment middleware
  app.use(x402BodyCompat());
  app.use(paymentMiddleware(routeConfig, server));

  // Deposit handlers
  for (const tier of DEPOSIT_TIERS) {
    app.post(`/deposit/${tier.usdc}`, async (c) => {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session?.user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const userId = UserId.parse(session.user.id);
      const paymentResponse = c.req.header("X-PAYMENT-RESPONSE");

      try {
        const result = await pointsService.creditPoints(
          userId,
          tier.points,
          "POINT_PURCHASE",
          {
            x402PaymentResponse: paymentResponse,
            usdcAmount: tier.usdc.toString(),
          }
        );

        logger.info(
          {
            userId,
            usdc: tier.usdc,
            points: tier.points,
            transactionId: result.transaction?.id,
          },
          "Deposit completed"
        );

        return c.json({
          success: true,
          usdc: tier.usdc,
          points: tier.points,
          newBalance: result.balance?.points,
          transactionId: result.transaction?.id,
        });
      } catch (error) {
        logger.error({ error, userId, tier }, "Deposit failed");
        return c.json({ error: "Deposit failed" }, 500);
      }
    });
  }

  // List available deposit tiers
  app.get("/deposit/tiers", (c) =>
    c.json({
      tiers: DEPOSIT_TIERS.map((tier) => ({
        usdc: tier.usdc,
        points: tier.points,
        route: `/api/deposit/${tier.usdc}`,
      })),
      networks: [X402_CONFIG.evm.network, X402_CONFIG.solana.network],
    })
  );

  // Dev-only deposit endpoint (bypasses x402 payment)
  if (appEnv === "dev") {
    app.post("/deposit/dev/:usdc", async (c) => {
      const usdcStr = c.req.param("usdc");
      const usdc = Number(usdcStr);

      const tier = DEPOSIT_TIERS.find((t) => t.usdc === usdc);
      if (!tier) {
        return c.json({ error: "Invalid tier" }, 400);
      }

      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session?.user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const userId = UserId.parse(session.user.id);

      const result = await pointsService.creditPoints(
        userId,
        tier.points,
        "POINT_PURCHASE",
        {
          reason: "dev_deposit",
          usdcAmount: tier.usdc.toString(),
        }
      );

      logger.info(
        { userId, usdc: tier.usdc, points: tier.points },
        "Dev deposit completed"
      );

      return c.json({
        success: true,
        usdc: tier.usdc,
        points: tier.points,
        newBalance: result.balance?.points,
      });
    });
  }

  return app;
}
