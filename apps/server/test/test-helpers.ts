import { faker } from "@faker-js/faker";
import type { Context } from "@yoda.fun/api/context";
import type { TestSetup } from "./test.setup";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const SEVEN_DAYS_MS =
  MS_PER_SECOND *
  SECONDS_PER_MINUTE *
  MINUTES_PER_HOUR *
  HOURS_PER_DAY *
  DAYS_PER_WEEK;

/**
 * Creates an orpc context for authenticated user
 */
export function createAuthenticatedContext(testEnv: TestSetup): Context {
  return {
    session: {
      session: {
        id: crypto.randomUUID(),
        token: testEnv.users.authenticated.token,
        userId: testEnv.users.authenticated.id,
        expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: testEnv.users.authenticated.id,
        email: testEnv.users.authenticated.email,
        name: "Test User",
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    db: testEnv.deps.db,
    logger: testEnv.deps.logger,
    betService: testEnv.deps.betService,
  };
}

/**
 * Creates an orpc context without authentication
 */
export function createUnauthenticatedContext(testEnv: TestSetup): Context {
  return {
    session: null,
    db: testEnv.deps.db,
    logger: testEnv.deps.logger,
    betService: testEnv.deps.betService,
  };
}

/**
 * Generates a test wallet address (Ethereum format)
 */
export function generateWalletAddress(): `0x${string}` {
  return `0x${faker.string.hexadecimal({ length: 40, casing: "lower", prefix: "" })}`;
}

/**
 * Generates a test email
 */
export function generateEmail(): string {
  return faker.internet.email();
}

/**
 * Generates a test user name
 */
export function generateName(): string {
  return faker.person.fullName();
}
