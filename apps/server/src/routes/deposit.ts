import { createBalanceService } from "@yoda.fun/api/services/balance-service";
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

// Fixed deposit tiers in USD
const DEPOSIT_TIERS = [10, 25, 50, 100] as const;

export function createDepositRoutes(deps: DepositRouteDeps) {
  const { db, auth, logger, depositWalletAddress, network, appEnv } = deps;
  const app = new Hono();

  const balanceService = createBalanceService({ deps: { db, logger } });

  // Build route config for x402
  const routeConfig: Record<string, { price: string; network: Network }> = {};
  for (const tier of DEPOSIT_TIERS) {
    routeConfig[`/deposit/${tier}`] = {
      price: `$${tier}.00`,
      network,
    };
  }

  // Deposit handlers with x402 payment middleware per-route
  for (const tier of DEPOSIT_TIERS) {
    app.post(
      `/deposit/${tier}`,
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
          // Credit the user's balance
          const result = await balanceService.creditBalance(
            userId,
            tier,
            "DEPOSIT",
            {
              x402PaymentResponse: paymentResponse,
              tier,
              network,
            }
          );

          logger.info(
            {
              userId,
              amount: tier,
              transactionId: result.transaction?.id,
            },
            "Deposit completed"
          );

          return c.json({
            success: true,
            amount: tier,
            newBalance: Number(result.balance?.availableBalance),
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
      tiers: DEPOSIT_TIERS.map((amount) => ({
        amount,
        route: `/api/deposit/${amount}`,
      })),
      network,
    })
  );

  // Dev-only deposit endpoint (bypasses x402 payment)
  if (appEnv === "dev") {
    app.post("/deposit/dev/:tier", async (c) => {
      const tierStr = c.req.param("tier");
      const tier = Number(tierStr);

      if (!DEPOSIT_TIERS.includes(tier as (typeof DEPOSIT_TIERS)[number])) {
        return c.json({ error: "Invalid tier" }, 400);
      }

      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session?.user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const userId = UserId.parse(session.user.id);

      const result = await balanceService.creditBalance(
        userId,
        tier,
        "DEPOSIT",
        {
          reason: "dev_deposit",
        }
      );

      logger.info({ userId, amount: tier }, "Dev deposit completed");

      return c.json({
        success: true,
        amount: tier,
        newBalance: Number(result.balance?.availableBalance),
      });
    });
  }

  return app;
}
