import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@yoda.fun/api/context";
import { appRouter } from "@yoda.fun/api/routers";
import { createAuth } from "@yoda.fun/auth";
import { createDb } from "@yoda.fun/db";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "@/env";

const app = new Hono();

// Create db and auth instances
const db = createDb({ dbData: { type: "pg", databaseUrl: env.DATABASE_URL } });
const auth = createAuth({
  db,
  appEnv: env.APP_ENV,
  secret: env.BETTER_AUTH_SECRET,
});

app.use(logger());
app.use(
  "/*",
  cors({
    origin: SERVICE_URLS[env.APP_ENV].web,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter);

app.use("/*", async (c, next) => {
  const context = await createContext({
    context: c,
    auth,
  });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.get("/", (c) => c.text("OK"));

export default app;
