import { createAuth } from "@yoda.fun/auth";
import { createDb } from "@yoda.fun/db";
import { env } from "./env";

const db = createDb({ dbData: { type: "pg", databaseUrl: env.DATABASE_URL } });
export const auth = createAuth({
  db,
  appEnv: env.APP_ENV,
  secret: env.BETTER_AUTH_SECRET,
});
