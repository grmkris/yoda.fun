import { faker } from "@faker-js/faker";
import type { Context } from "@yoda.fun/api/context";
import type { TestSetup } from "./test.setup";

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

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
  };
}

/**
 * Creates an orpc context without authentication
 */
export function createUnauthenticatedContext(): Context {
  return {
    session: null,
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
