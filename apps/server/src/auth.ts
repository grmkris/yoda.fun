import { createAuth } from "@yoda.fun/auth";
import { createDb } from "@yoda.fun/db";
import { createPgLite } from "@yoda.fun/test-utils/pg-lite";
import { env } from "./env";

const db = createDb({ dbData: { type: "pglite", db: createPgLite() } });
export const auth = createAuth({
  db,
  appEnv: env.APP_ENV,
  secret: env.BETTER_AUTH_SECRET,
});
