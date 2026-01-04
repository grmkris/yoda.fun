import { type AiClient, createAiClient } from "@yoda.fun/ai";
import { createBetService } from "@yoda.fun/api/services/bet-service";
import { createDailyService } from "@yoda.fun/api/services/daily-service";
import { createFollowService } from "@yoda.fun/api/services/follow-service";
import { createLeaderboardService } from "@yoda.fun/api/services/leaderboard-service";
import { createPointsService } from "@yoda.fun/api/services/points-service";
import { createProfileService } from "@yoda.fun/api/services/profile-service";
import { createRewardService } from "@yoda.fun/api/services/reward-service";
import { type Auth, createAuth } from "@yoda.fun/auth";
import { createDb, type Database, runMigrations } from "@yoda.fun/db";
import { createLogger, type Logger, type LoggerConfig } from "@yoda.fun/logger";
import { createQueueClient, type QueueClient } from "@yoda.fun/queue";
import { createStorageClient } from "@yoda.fun/storage";
import { createPgLite, type PGlite } from "@yoda.fun/test-utils/pg-lite";
import { createTestRedisSetup } from "@yoda.fun/test-utils/redis-test-server";
import { createTestS3Setup } from "@yoda.fun/test-utils/s3-test-server";
import type { User } from "better-auth";
import type { Logger as DrizzleLogger } from "drizzle-orm";
import { env } from "@/env";

const SessionTokenRegex = /better-auth\.session_token=([^;]+)/;

export interface TestUser {
  id: string;
  email: string;
  name: string;
  token: string; // session token for cookies
  user: User;
}

export interface TestSetup {
  deps: {
    db: Database;
    pgLite: PGlite;
    authClient: Auth;
    logger: Logger;
    storage: ReturnType<typeof createStorageClient>;
    aiClient: AiClient;
    redis: Awaited<ReturnType<typeof createTestRedisSetup>>;
    queue: QueueClient;
    betService: ReturnType<typeof createBetService>;
    pointsService: ReturnType<typeof createPointsService>;
    dailyService: ReturnType<typeof createDailyService>;
    leaderboardService: ReturnType<typeof createLeaderboardService>;
    profileService: ReturnType<typeof createProfileService>;
    followService: ReturnType<typeof createFollowService>;
    rewardService: ReturnType<typeof createRewardService>;
  };
  users: {
    authenticated: TestUser;
    unauthenticated: TestUser;
  };
  cleanup: () => Promise<void>;
  close: () => Promise<void>;
}

async function createTestUser(
  authClient: Auth,
  email: string,
  name: string
): Promise<TestUser> {
  const password = "testtesttesttest";

  const signUpResult = await authClient.api.signUpEmail({
    body: { email, name, password },
  });

  if (!signUpResult) {
    throw new Error(`Failed to sign up user ${email}`);
  }

  const signInResponse = await authClient.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });

  if (!signInResponse?.ok) {
    throw new Error(`Failed to sign in user ${email}`);
  }

  const setCookieHeader = signInResponse.headers.get("set-cookie") || "";
  const sessionTokenMatch = setCookieHeader.match(SessionTokenRegex);
  if (!sessionTokenMatch) {
    throw new Error(`Failed to extract session token for user ${email}`);
  }
  const sessionToken = sessionTokenMatch[1];
  if (!sessionToken) {
    throw new Error(`Failed to extract session token value for user ${email}`);
  }

  return {
    id: signUpResult.user.id,
    email,
    name,
    token: sessionToken,
    user: signUpResult.user,
  };
}

export async function createTestSetup(): Promise<TestSetup> {
  const testLogLevel =
    (process.env.TEST_LOG_LEVEL as LoggerConfig["level"]) ?? "error";
  const logger = createLogger({
    appName: "test.setup",
    level: testLogLevel,
    environment: "dev",
  });

  const pgLite = createPgLite();
  const drizzleLogger: DrizzleLogger = {
    logQuery: (query, params) => {
      if (testLogLevel === "debug" || testLogLevel === "trace") {
        logger.debug({ msg: "SQL Query", query, params });
      }
    },
  };

  const db = createDb({
    logger: drizzleLogger,
    dbData: {
      type: "pglite",
      db: pgLite,
    },
  });

  try {
    await runMigrations(db, logger);
    logger.debug({ msg: "Migrations applied successfully" });
  } catch (error) {
    logger.error({ msg: "Migration failed", error });
    throw error;
  }

  const authClient = createAuth({
    db,
    appEnv: env.APP_ENV,
    secret: env.BETTER_AUTH_SECRET,
  });

  logger.debug({ msg: "Creating test users..." });

  const authenticatedUser = await createTestUser(
    authClient,
    "authenticated@test.com",
    "Authenticated User"
  );

  const unauthenticatedUser = await createTestUser(
    authClient,
    "unauthenticated@test.com",
    "Unauthenticated User"
  );

  const s3Setup = await createTestS3Setup("test-s3-bucket");
  const storage = createStorageClient({
    s3Client: s3Setup.client,
    env: env.APP_ENV,
    logger,
  });

  const redis = await createTestRedisSetup();
  const queue = createQueueClient({
    url: redis.uri,
    logger,
  });

  const aiClient = createAiClient({
    logger,
    environment: env.APP_ENV,
    providerConfigs: {
      googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
      groqApiKey: process.env.GROQ_API_KEY || "",
      xaiApiKey: process.env.XAI_API_KEY || "",
    },
  });

  const pointsService = createPointsService({ deps: { db, logger } });
  const dailyService = createDailyService({
    deps: { db, logger, pointsService },
  });
  const betService = createBetService({ deps: { db, logger, dailyService } });
  const leaderboardService = createLeaderboardService({ deps: { db, logger } });
  const profileService = createProfileService({ deps: { db, logger } });
  const followService = createFollowService({
    deps: { db, logger, profileService },
  });
  const rewardService = createRewardService({
    deps: { db, pointsService },
  });
  logger.info({
    msg: "Test environment setup complete",
    users: 2,
    services: [
      "db",
      "auth",
      "storage",
      "redis",
      "queue",
      "ai",
      "betService",
      "pointsService",
      "dailyService",
    ],
  });

  const cleanup = async () => {
    await Promise.resolve();
    logger.debug({ msg: "Test data cleaned up" });
  };

  const close = async () => {
    try {
      await queue.close();
      await s3Setup.shutdown();
      await redis.shutdown();
      await pgLite.close();
      logger.info({ msg: "Test environment closed" });
    } catch (error) {
      logger.error({ msg: "Error closing test environment", error });
    }
  };

  return {
    deps: {
      db,
      pgLite,
      authClient,
      logger,
      storage,
      aiClient,
      redis,
      queue,
      betService,
      pointsService,
      dailyService,
      leaderboardService,
      profileService,
      followService,
      rewardService,
    },
    users: {
      authenticated: authenticatedUser,
      unauthenticated: unauthenticatedUser,
    },
    cleanup,
    close,
  };
}
