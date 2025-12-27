import { faker } from "@faker-js/faker";
import type { Context } from "@yoda.fun/api/context";
import type { BalanceService } from "@yoda.fun/api/services/balance-service";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import type { QueueClient } from "@yoda.fun/queue";
import type { JobType } from "@yoda.fun/shared/constants";
import { type MarketId, UserId } from "@yoda.fun/shared/typeid";
import type { TestSetup, TestUser } from "./test.setup";

export async function createTestContext(props: {
  token?: string;
  testSetup: TestSetup;
}): Promise<Context> {
  const { token, testSetup } = props;
  const { deps } = testSetup;

  const headers = new Headers(
    token ? { cookie: `better-auth.session_token=${token}` } : {}
  );

  const session = await deps.authClient.api.getSession({ headers });

  return {
    session,
    db: deps.db,
    logger: deps.logger,
    posthog: undefined,
    storage: deps.storage,
    betService: deps.betService,
    balanceService: deps.balanceService,
    withdrawalService: deps.withdrawalService,
    leaderboardService: deps.leaderboardService,
    profileService: deps.profileService,
    followService: deps.followService,
    rewardService: deps.rewardService,
  };
}

export function createUnauthenticatedContext(testEnv: TestSetup): Context {
  return {
    session: null,
    db: testEnv.deps.db,
    logger: testEnv.deps.logger,
    posthog: undefined,
    storage: testEnv.deps.storage,
    betService: testEnv.deps.betService,
    balanceService: testEnv.deps.balanceService,
    withdrawalService: testEnv.deps.withdrawalService,
    leaderboardService: testEnv.deps.leaderboardService,
    profileService: testEnv.deps.profileService,
    followService: testEnv.deps.followService,
    rewardService: testEnv.deps.rewardService,
  };
}

export function generateWalletAddress(): `0x${string}` {
  return `0x${faker.string.hexadecimal({ length: 40, casing: "lower", prefix: "" })}`;
}

export function generateEmail(): string {
  return faker.internet.email();
}

export function generateName(): string {
  return faker.person.fullName();
}

export interface CreateTestMarketOptions {
  title?: string;
  description?: string;
  category?: string;
  betAmount?: string;
  votingEndsAt?: Date;
  resolutionDeadline?: Date;
  createdById?: UserId;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export async function createTestMarket(
  db: Database,
  options: CreateTestMarketOptions = {}
): Promise<typeof DB_SCHEMA.market.$inferSelect> {
  const now = new Date();

  const marketRecords = await db
    .insert(DB_SCHEMA.market)
    .values({
      title: options.title ?? faker.lorem.sentence(),
      description: options.description ?? faker.lorem.paragraph(),
      category: options.category ?? "test",
      betAmount: options.betAmount ?? "10.00",
      votingEndsAt:
        options.votingEndsAt ?? new Date(now.getTime() + ONE_DAY_MS),
      resolutionDeadline:
        options.resolutionDeadline ?? new Date(now.getTime() + 2 * ONE_DAY_MS),
      createdById: options.createdById,
      status: "LIVE",
    })
    .returning();

  const market = marketRecords[0];
  if (!market) {
    throw new Error("Failed to create test market");
  }

  return market;
}

export function createEndedTestMarket(
  db: Database,
  options: CreateTestMarketOptions = {}
): Promise<typeof DB_SCHEMA.market.$inferSelect> {
  const now = new Date();

  return createTestMarket(db, {
    ...options,
    votingEndsAt: new Date(now.getTime() - ONE_HOUR_MS),
    resolutionDeadline: new Date(now.getTime() - ONE_HOUR_MS / 2),
  });
}

export async function fundUserBalance(
  balanceService: BalanceService,
  userId: UserId,
  amount: number
): Promise<void> {
  await balanceService.creditBalance(userId, amount, "DEPOSIT", {
    source: "test",
  });
}

interface CreateTestBetOptions {
  db: Database;
  userId: UserId;
  marketId: MarketId;
  vote: "YES" | "NO";
  amount?: string;
}

export async function createTestBet(
  options: CreateTestBetOptions
): Promise<typeof DB_SCHEMA.bet.$inferSelect> {
  const { db, userId, marketId, vote, amount = "10.00" } = options;

  const betRecords = await db
    .insert(DB_SCHEMA.bet)
    .values({
      userId,
      marketId,
      vote,
      amount,
      status: "ACTIVE",
    })
    .returning();

  const bet = betRecords[0];
  if (!bet) {
    throw new Error("Failed to create test bet");
  }

  return bet;
}

export type E2ETestUser = TestUser & { userId: UserId };

const SessionTokenRegex = /better-auth\.session_token=([^;]+)/;

export async function createTestUserWithFunds(
  testSetup: TestSetup,
  name: string,
  email: string,
  initialBalance: number
): Promise<E2ETestUser> {
  const { deps } = testSetup;
  const password = "testtesttesttest";

  const signUpResult = await deps.authClient.api.signUpEmail({
    body: { email, name, password },
  });

  if (!signUpResult) {
    throw new Error(`Failed to sign up user ${email}`);
  }

  const signInResponse = await deps.authClient.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });

  if (!signInResponse?.ok) {
    throw new Error(`Failed to sign in user ${email}`);
  }

  const setCookieHeader = signInResponse.headers.get("set-cookie") || "";
  const sessionTokenMatch = setCookieHeader.match(SessionTokenRegex);
  if (!sessionTokenMatch?.[1]) {
    throw new Error(`Failed to extract session token for user ${email}`);
  }

  const userId = UserId.parse(signUpResult.user.id);

  await fundUserBalance(deps.balanceService, userId, initialBalance);

  return {
    id: signUpResult.user.id,
    email,
    name,
    token: sessionTokenMatch[1],
    user: signUpResult.user,
    userId,
  };
}

export async function waitForQueueJob<T extends JobType>(
  queue: QueueClient,
  queueName: T,
  jobId: string,
  maxWaitMs = 30_000
): Promise<{ success: boolean; state: string }> {
  const pollInterval = 500;
  let elapsed = 0;

  while (elapsed < maxWaitMs) {
    const status = await queue.getJobStatus(queueName, jobId);

    if (status?.state === "completed") {
      return { success: true, state: "completed" };
    }

    if (status?.state === "failed") {
      throw new Error(`Job failed: ${status.failedReason}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;
  }

  throw new Error(`Job timed out after ${maxWaitMs}ms`);
}

export async function verifyBalanceIntegrity(
  db: Database,
  expectedTotal: number
): Promise<{ valid: boolean; actual: number; expected: number }> {
  const balances = await db.select().from(DB_SCHEMA.userBalance);

  const totalBalances = balances.reduce(
    (sum, b) => sum + Number(b.availableBalance) + Number(b.pendingBalance),
    0
  );

  const withdrawals = await db.select().from(DB_SCHEMA.withdrawal);
  const totalWithdrawn = withdrawals
    .filter((w) => w.status === "COMPLETED")
    .reduce((sum, w) => sum + Number(w.amount), 0);

  const pendingWithdrawn = withdrawals
    .filter((w) => w.status === "PENDING")
    .reduce((sum, w) => sum + Number(w.amount), 0);

  const actual = totalBalances + totalWithdrawn + pendingWithdrawn;

  return {
    valid: Math.abs(actual - expectedTotal) < 0.01,
    actual,
    expected: expectedTotal,
  };
}
