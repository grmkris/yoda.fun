import { createPointsService } from "@yoda.fun/api/services/points-service";
import type { Auth } from "@yoda.fun/auth";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { Network } from "@yoda.fun/shared/constants";
import type { Environment } from "@yoda.fun/shared/services";
import { UserId } from "@yoda.fun/shared/typeid";
import { Hono } from "hono";
import { paymentMiddleware } from "x402-hono";

interface DepositRouteDeps {
  db: Database;
  auth: Auth;
  logger: Logger;
  depositWalletAddress: `0x${string}`;
  network: Network;
  appEnv: Environment;
}

// Fixed deposit tiers in USD with point conversions
const DEPOSIT_TIERS = [
  { usdc: 10, points: 120 },
  { usdc: 25, points: 320 },
  { usdc: 50, points: 700 },
  { usdc: 100, points: 1500 },
] as const;

export function createDepositRoutes(deps: DepositRouteDeps) {
  const { db, auth, logger, depositWalletAddress, network, appEnv } = deps;
  const app = new Hono();

  const pointsService = createPointsService({ deps: { db, logger } });

  // Build route config for x402
  const routeConfig: Record<string, { price: string; network: Network }> = {};
  for (const tier of DEPOSIT_TIERS) {
    routeConfig[`/deposit/${tier.usdc}`] = {
      price: `$${tier.usdc}.00`,
      network,
    };
  }

  // Deposit handlers with x402 payment middleware per-route
  for (const tier of DEPOSIT_TIERS) {
    app.post(
      `/deposit/${tier.usdc}`,
      paymentMiddleware(depositWalletAddress, routeConfig),
      async (c) => {
        // Get authenticated user
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        });

        if (!session?.user) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        const userId = UserId.parse(session.user.id);

        // Get payment response from x402 header
        const paymentResponse = c.req.header("X-PAYMENT-RESPONSE");

        try {
          // Credit the user's points
          const result = await pointsService.creditPoints(
            userId,
            tier.points,
            "POINT_PURCHASE",
            {
              x402PaymentResponse: paymentResponse,
              usdcAmount: tier.usdc.toString(),
              network,
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
      }
    );
  }

  // List available deposit tiers
  app.get("/deposit/tiers", (c) =>
    c.json({
      tiers: DEPOSIT_TIERS.map((tier) => ({
        usdc: tier.usdc,
        points: tier.points,
        route: `/api/deposit/${tier.usdc}`,
      })),
      network,
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
