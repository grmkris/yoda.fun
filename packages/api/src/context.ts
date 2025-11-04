import type { Auth } from "@yoda.fun/auth";
import type { Database } from "@yoda.fun/db";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
  context: HonoContext;
  auth: Auth;
  db: Database;
};

export async function createContext({
  context,
  auth,
  db,
}: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    session,
    db,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
