import type { Auth } from "@yoda.fun/auth";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { Context as HonoContext } from "hono";
import type { PostHog } from "posthog-node";
import { createBalanceService } from "./services/balance-service";
import { createBetService } from "./services/bet-service";
import { createWithdrawalService } from "./services/withdrawal-service";

export type CreateContextOptions = {
  context: HonoContext;
  auth: Auth;
  db: Database;
  logger: Logger;
  posthog?: PostHog;
};

export async function createContext({
  context,
  auth,
  db,
  logger,
  posthog,
}: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  // Create services
  const betService = createBetService({ deps: { db, logger } });
  const balanceService = createBalanceService({ deps: { db, logger } });
  const withdrawalService = createWithdrawalService({ deps: { db, logger } });

  return {
    session,
    db,
    logger,
    posthog,
    betService,
    balanceService,
    withdrawalService,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
