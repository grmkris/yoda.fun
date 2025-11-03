import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

/**
 * Creates a new PGlite instance, or returns the existing one if it already exists
 * @returns The PGlite instance
 */
export const createPgLite = () => {
  const db = new PGlite({
    extensions: {
      uuid_ossp,
      pg_trgm,
    },
  });
  return db;
};

export type { PGlite } from "@electric-sql/pglite";
