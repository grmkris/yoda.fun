import { createBalanceService } from "@yoda.fun/api/services/balance-service";
import type { Auth } from "@yoda.fun/auth";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import { UserId } from "@yoda.fun/shared/typeid";
import { Hono } from "hono";
import { paymentMiddleware } from "x402-hono";
import type { Network } from "../env";

type DepositRouteDeps = {
  db: Database;
  auth: Auth;
  logger: Logger;
  depositWalletAddress: `0x${string}`;
  network: Network;
};

// Fixed deposit tiers in USD
const DEPOSIT_TIERS = [10, 25, 50, 100] as const;

export function createDepositRoutes(deps: DepositRouteDeps) {
  const { db, auth, logger, depositWalletAddress, network } = deps;
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

  // Apply x402 payment middleware
  app.use("/deposit/*", paymentMiddleware(depositWalletAddress, routeConfig));

  // Deposit handlers - called after successful x402 payment
  for (const tier of DEPOSIT_TIERS) {
    app.post(`/deposit/${tier}`, async (c) => {
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
    });
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

  return app;
}
