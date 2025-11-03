import { faker } from "@faker-js/faker";
import * as schema from "@yoda.fun/db/schema/auth";
import { createPgLite, type PGlite } from "@yoda.fun/test-utils/pg-lite";
import { sql } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

export type TestUser = {
  id: string;
  email: string;
  password: string;
  token: string;
};

export type TestSetup = {
  deps: {
    db: PgliteDatabase<typeof schema>;
    pgLite: PGlite;
  };
  users: {
    authenticated: TestUser;
    unauthenticated: TestUser;
  };
  cleanup: () => Promise<void>;
  close: () => Promise<void>;
};

/**
 * Creates a test user with better-auth
 */
async function createTestUser(
  db: PgliteDatabase<typeof schema>,
  options?: { email?: string; password?: string }
): Promise<TestUser> {
  const email = options?.email || faker.internet.email();
  const password = options?.password || "testtesttesttest";

  // Create user using better-auth pattern
  const userId = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();

  // @ts-expect-error - Bun workspace drizzle-orm duplication issue
  await db.insert(schema.user).values({
    id: userId,
    name: faker.person.fullName(),
    email,
    emailVerified: true,
    image: faker.image.avatar(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create account for email/password auth
  // @ts-expect-error - Bun workspace drizzle-orm duplication issue
  await db.insert(schema.account).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password, // In real better-auth this would be hashed
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create session
  // @ts-expect-error - Bun workspace drizzle-orm duplication issue
  await db.insert(schema.session).values({
    id: crypto.randomUUID(),
    token: sessionToken,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: userId,
    email,
    password,
    token: sessionToken,
  };
}

/**
 * Creates a complete test environment with in-memory database and test users
 */
export async function createTestSetup(): Promise<TestSetup> {
  // Create in-memory PGlite database
  const pgLite = createPgLite();

  // Create Drizzle instance
  const db = drizzle(pgLite, { schema });

  // Run migrations (if they exist) or push schema
  try {
    await migrate(db, { migrationsFolder: "../../packages/db/src/migrations" });
  } catch {
    // If migrations don't exist, create tables directly from schema
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "email_verified" boolean NOT NULL,
        "image" text,
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY NOT NULL,
        "expires_at" timestamp NOT NULL,
        "token" text NOT NULL UNIQUE,
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" text PRIMARY KEY NOT NULL,
        "account_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "access_token" text,
        "refresh_token" text,
        "id_token" text,
        "access_token_expires_at" timestamp,
        "refresh_token_expires_at" timestamp,
        "scope" text,
        "password" text,
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" text PRIMARY KEY NOT NULL,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp,
        "updated_at" timestamp
      );
    `);
  }

  // Create test users
  const authenticatedUser = await createTestUser(db, {
    email: "authenticated@test.com",
  });

  const unauthenticatedUser = await createTestUser(db, {
    email: "unauthenticated@test.com",
  });

  // Cleanup function to reset data between tests
  const cleanup = async () => {
    await db.execute(
      sql`DELETE FROM "session" WHERE "user_id" NOT IN (${authenticatedUser.id}, ${unauthenticatedUser.id})`
    );
    await db.execute(
      sql`DELETE FROM "account" WHERE "user_id" NOT IN (${authenticatedUser.id}, ${unauthenticatedUser.id})`
    );
    await db.execute(
      sql`DELETE FROM "user" WHERE "id" NOT IN (${authenticatedUser.id}, ${unauthenticatedUser.id})`
    );
    await db.execute(sql`DELETE FROM "verification"`);
  };

  // Close function to shut down the database
  const close = async () => {
    await pgLite.close();
  };

  return {
    deps: {
      db,
      pgLite,
    },
    users: {
      authenticated: authenticatedUser,
      unauthenticated: unauthenticatedUser,
    },
    cleanup,
    close,
  };
}
