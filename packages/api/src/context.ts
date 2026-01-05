import type { Auth } from "@yoda.fun/auth";
import type { Database } from "@yoda.fun/db";
import type { ERC8004Client } from "@yoda.fun/erc8004";
import type { Logger } from "@yoda.fun/logger";
import type { QueueClient } from "@yoda.fun/queue";
import type { StorageClient } from "@yoda.fun/storage";
import type { Context as HonoContext } from "hono";
import type { PostHog } from "posthog-node";
import { createBetService } from "./services/bet-service";
import { createDailyService } from "./services/daily-service";
import { createERC8004Service } from "./services/erc8004-service";
import { createFollowService } from "./services/follow-service";
import { createLeaderboardService } from "./services/leaderboard-service";
import { createPointsService } from "./services/points-service";
import { createProfileService } from "./services/profile-service";
import { createRewardService } from "./services/reward-service";

export interface CreateContextOptions {
  context: HonoContext;
  auth: Auth;
  db: Database;
  logger: Logger;
  posthog?: PostHog;
  storage: StorageClient;
  queue: QueueClient;
  erc8004Client: ERC8004Client;
}

export async function createContext({
  context,
  auth,
  db,
  logger,
  posthog,
  storage,
  queue,
  erc8004Client,
}: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  // Create services - order matters for dependencies
  const pointsService = createPointsService({ deps: { db, logger } });
  const dailyService = createDailyService({
    deps: { db, logger, pointsService },
  });
  const leaderboardService = createLeaderboardService({ deps: { db, logger } });
  const profileService = createProfileService({ deps: { db, logger } });
  const followService = createFollowService({
    deps: { db, logger, profileService },
  });
  const betService = createBetService({
    deps: { db, logger, dailyService },
  });
  const rewardService = createRewardService({
    deps: { db, pointsService },
  });
  const erc8004Service = createERC8004Service({
    deps: { db, logger, erc8004Client },
  });

  return {
    session,
    db,
    logger,
    posthog,
    storage,
    queue,
    betService,
    pointsService,
    dailyService,
    leaderboardService,
    profileService,
    followService,
    rewardService,
    erc8004Service,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
