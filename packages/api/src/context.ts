import type { Auth } from "@yoda.fun/auth";
import type { Database } from "@yoda.fun/db";
import type { Logger } from "@yoda.fun/logger";
import type { QueueClient } from "@yoda.fun/queue";
import type { StorageClient } from "@yoda.fun/storage";
import type { Context as HonoContext } from "hono";
import type { PostHog } from "posthog-node";
import { createBalanceService } from "./services/balance-service";
import { createBetService } from "./services/bet-service";
import { createFollowService } from "./services/follow-service";
import { createLeaderboardService } from "./services/leaderboard-service";
import { createProfileService } from "./services/profile-service";
import { createRewardService } from "./services/reward-service";
import { createWithdrawalService } from "./services/withdrawal-service";

export interface CreateContextOptions {
  context: HonoContext;
  auth: Auth;
  db: Database;
  logger: Logger;
  posthog?: PostHog;
  storage?: StorageClient;
  queue?: QueueClient;
}

export async function createContext({
  context,
  auth,
  db,
  logger,
  posthog,
  storage,
  queue,
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
  const betService = createBetService({
    deps: { db, logger },
  });
  const rewardService = createRewardService({
    deps: { db, balanceService },
  });

  return {
    session,
    db,
    logger,
    posthog,
    storage,
    queue,
    betService,
    balanceService,
    withdrawalService,
    leaderboardService,
    profileService,
    followService,
    rewardService,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
