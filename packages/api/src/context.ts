import type { Auth } from "@yoda.fun/auth";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { Context as HonoContext } from "hono";
import { createBetService } from "./services/bet-service";

export type CreateContextOptions = {
  context: HonoContext;
  auth: Auth;
  db: Database;
  logger: Logger;
};

export async function createContext({
  context,
  auth,
  db,
  logger,
}: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  // Create services
  const betService = createBetService({
    deps: { db, logger },
  });

  return {
    session,
    db,
    logger,
    betService,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
