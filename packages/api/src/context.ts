import type { Auth } from "@yoda.fun/auth";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { Context as HonoContext } from "hono";
import type { PostHog } from "posthog-node";
import { createActivityService } from "./services/activity-service";
import { createBalanceService } from "./services/balance-service";
import { createBetService } from "./services/bet-service";
import { createFollowService } from "./services/follow-service";
import { createLeaderboardService } from "./services/leaderboard-service";
import { createProfileService } from "./services/profile-service";
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
  const balanceService = createBalanceService({ deps: { db, logger } });
  const withdrawalService = createWithdrawalService({ deps: { db, logger } });
  const leaderboardService = createLeaderboardService({ deps: { db, logger } });
  const profileService = createProfileService({ deps: { db, logger } });
  const followService = createFollowService({
    deps: { db, logger, profileService },
  });
  const activityService = createActivityService({
    deps: { db, logger, followService },
  });
  const betService = createBetService({
    deps: { db, logger, activityService },
  });

  return {
    session,
    db,
    logger,
    posthog,
    betService,
    balanceService,
    withdrawalService,
    leaderboardService,
    profileService,
    followService,
    activityService,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
