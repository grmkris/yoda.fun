import type { Logger as DrizzleLogger } from "drizzle-orm";
import { type BunSQLDatabase, drizzle } from "drizzle-orm/bun-sql";
import type { PgliteDatabase } from "drizzle-orm/pglite";
// biome-ignore lint/performance/noNamespaceImport: Drizzle requires full schema object for type inference
import * as schema from "./schema/auth";

export const DB_SCHEMA = schema;
export type Database =
  | BunSQLDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

export function createDb(props: {
  logger?: DrizzleLogger;
  databaseUrl: string;
}) {
  const { logger, databaseUrl } = props;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const database = drizzle(databaseUrl, { schema, logger });

  return database;
}

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function withTransaction<T>(
  db: Database,
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}
