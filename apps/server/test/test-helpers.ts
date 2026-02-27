import { faker } from "@faker-js/faker";
import type { Context } from "@yoda.fun/api/context";
import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { UserId } from "@yoda.fun/shared/typeid";
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
    leaderboardService: deps.leaderboardService,
    profileService: deps.profileService,
    followService: deps.followService,
    rewardService: deps.rewardService,
    fhevmClient: null as unknown as Context["fhevmClient"],
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
    leaderboardService: testEnv.deps.leaderboardService,
    profileService: testEnv.deps.profileService,
    followService: testEnv.deps.followService,
    rewardService: testEnv.deps.rewardService,
    fhevmClient: null as unknown as Context["fhevmClient"],
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
  onChainMarketId?: number;
  votingEndsAt?: Date;
  resolutionDeadline?: Date;
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
      onChainMarketId: options.onChainMarketId ?? 0,
      onChainTxHash: `0x${faker.string.hexadecimal({ length: 64, casing: "lower", prefix: "" })}`,
      votingEndsAt:
        options.votingEndsAt ?? new Date(now.getTime() + ONE_DAY_MS),
      resolutionDeadline:
        options.resolutionDeadline ?? new Date(now.getTime() + 2 * ONE_DAY_MS),
      status: "LIVE",
    })
    .returning();

  const market = marketRecords[0];
  if (!market) {
    throw new Error("Failed to create test market");
  }

  return market;
}

export type E2ETestUser = TestUser & { userId: UserId };

const SessionTokenRegex = /better-auth\.session_token=([^;]+)/;

export async function createTestUserWithFunds(
  testSetup: TestSetup,
  name: string,
  email: string
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

  return {
    id: signUpResult.user.id,
    email,
    name,
    token: sessionTokenMatch[1],
    user: signUpResult.user,
    userId,
  };
}
