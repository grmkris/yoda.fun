import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import type { Logger } from "@yoda.fun/logger";
import type { Logger as DrizzleLogger } from "drizzle-orm";
import { BunSQLDatabase, drizzle as drizzleBunSQL } from "drizzle-orm/bun-sql";
import { migrate as migrateBunSql } from "drizzle-orm/bun-sql/migrator";
import { drizzle as drizzlePglite, PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePgLite } from "drizzle-orm/pglite/migrator";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as auditSchema from "./schema/audit/schema.db";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as authSchema from "./schema/auth/schema.db";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as configSchema from "./schema/config/schema.db";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as marketSchema from "./schema/market/schema.db";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as mediaSchema from "./schema/media/schema.db";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as rewardsSchema from "./schema/rewards/schema.db";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as socialSchema from "./schema/social/schema.db";

const schema = {
  ...auditSchema,
  ...authSchema,
  ...configSchema,
  ...marketSchema,
  ...socialSchema,
  ...rewardsSchema,
  ...mediaSchema,
};
export const DB_SCHEMA = schema;
export type Database =
  | BunSQLDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

export function createDb(props: {
  logger?: DrizzleLogger;
  dbData:
    | {
        type: "pg";
        databaseUrl: string;
      }
    | {
        type: "pglite";
        db: PGlite;
      };
}): Database {
  const { logger, dbData } = props;

  const database =
    dbData.type === "pg"
      ? drizzleBunSQL(dbData.databaseUrl, { schema, logger })
      : drizzlePglite(dbData.db, { schema, logger });

  return database;
}

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function withTransaction<T>(
  db: Database,
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}

export async function runMigrations(
  db: Database,
  logger?: Logger
): Promise<void> {
  logger?.info({}, "Running database migrations");

  // Resolve migrations folder using import.meta.dir (Bun's __dirname equivalent)
  // This works in both development and production because it resolves relative to
  // the source file location, not process.cwd() which depends on WORKDIR
  const migrationsFolder = join(import.meta.dir, "../drizzle");

  if (db instanceof BunSQLDatabase) {
    await migrateBunSql(db, { migrationsFolder });
  } else if (db instanceof PgliteDatabase) {
    await migratePgLite(db, { migrationsFolder });
  } else {
    throw new Error("Unsupported database type");
  }

  logger?.info({}, "Database migrations completed");
}
