import type { Auth } from "@yoda.fun/auth";
import type { Database } from "@yoda.fun/db";
import type { FhevmClient } from "@yoda.fun/fhevm/sdk/server-client";
import type { Logger } from "@yoda.fun/logger";
import type { StorageClient } from "@yoda.fun/storage";
import type { Context as HonoContext } from "hono";
import type { PostHog } from "posthog-node";
import { createBetService } from "./services/bet-service";
import { createFollowService } from "./services/follow-service";
import { createLeaderboardService } from "./services/leaderboard-service";
import { createProfileService } from "./services/profile-service";
import { createRewardService } from "./services/reward-service";

export interface CreateContextOptions {
  context: HonoContext;
  auth: Auth;
  db: Database;
  logger: Logger;
  posthog?: PostHog;
  storage: StorageClient;
  fhevmClient: FhevmClient;
}

export async function createContext({
  context,
  auth,
  db,
  logger,
  posthog,
  storage,
  fhevmClient,
}: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  const leaderboardService = createLeaderboardService({ deps: { db, logger } });
  const profileService = createProfileService({ deps: { db, logger } });
  const followService = createFollowService({
    deps: { db, logger, profileService },
  });
  const betService = createBetService({
    deps: { db, logger },
  });
  const rewardService = createRewardService({
    deps: { db },
  });
  return {
    session,
    db,
    logger,
    posthog,
    storage,
    betService,
    leaderboardService,
    profileService,
    followService,
    rewardService,
    fhevmClient,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
