import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createAiClient } from "@yoda.fun/ai";
import { createContext } from "@yoda.fun/api/context";
import { appRouter } from "@yoda.fun/api/routers";
import { createAuth } from "@yoda.fun/auth";
import { createDb } from "@yoda.fun/db";
import { createLogger } from "@yoda.fun/logger";
import { createQueueClient, type QueueClient } from "@yoda.fun/queue";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { env } from "@/env";
import {
  captureException,
  createPostHogClient,
  shutdownPostHog,
} from "@/lib/posthog";
import { createDepositRoutes } from "@/routes/deposit";
import { createMarketResolutionWorker } from "@/workers/market-resolution.worker";

const app = new Hono();

// Create db, auth, and logger instances
const db = createDb({ dbData: { type: "pg", databaseUrl: env.DATABASE_URL } });
const auth = createAuth({
  db,
  appEnv: env.APP_ENV,
  secret: env.BETTER_AUTH_SECRET,
});
const logger = createLogger({
  level: env.APP_ENV === "prod" ? "info" : "debug",
  nodeEnv: env.APP_ENV === "prod" ? "production" : "development",
  appName: "yoda-server",
});

// Initialize PostHog (optional - only if API key is configured)
const posthog = createPostHogClient({
  apiKey: env.POSTHOG_API_KEY,
  host: env.POSTHOG_HOST,
  logger,
});

app.use(honoLogger());
app.use(
  "/*",
  cors({
    origin: SERVICE_URLS[env.APP_ENV].web,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Global error handler with PostHog error tracking
app.onError(async (err, c) => {
  logger.error({ err, path: c.req.path, method: c.req.method }, "Server error");

  await captureException(err, "server_anonymous", {
    $set: { environment: env.APP_ENV },
    path: c.req.path,
    method: c.req.method,
    url: c.req.url,
  });

  return c.json({ error: "Internal Server Error" }, 500);
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// x402 deposit routes (only if wallet configured)
if (env.DEPOSIT_WALLET_ADDRESS) {
  const depositRoutes = createDepositRoutes({
    db,
    auth,
    logger,
    depositWalletAddress: env.DEPOSIT_WALLET_ADDRESS as `0x${string}`,
    network: env.NETWORK,
  });
  app.route("/api", depositRoutes);
  logger.info({ network: env.NETWORK }, "x402 deposit routes enabled");
}

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
    db,
    logger,
    posthog,
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

// Initialize queue and worker (if enabled)
let queue: QueueClient | undefined;
let resolutionWorker: { close: () => Promise<void> } | undefined;

if (env.ENABLE_RESOLUTION_WORKER && env.REDIS_URL && env.XAI_API_KEY) {
  queue = createQueueClient({
    url: env.REDIS_URL,
    logger,
  });

  const aiClient = createAiClient({
    logger,
    environment: env.APP_ENV,
    posthog,
    providerConfigs: {
      xaiApiKey: env.XAI_API_KEY,
    },
  });

  resolutionWorker = createMarketResolutionWorker({
    queue,
    db,
    logger,
    aiClient,
  });

  logger.info({ msg: "Market resolution worker started" });
}

// Export queue for use in other modules (e.g., market creation)
export { queue };

// Graceful shutdown handler
process.on("SIGTERM", async () => {
  logger.info({ msg: "Shutting down server..." });
  await resolutionWorker?.close();
  await queue?.close();
  await shutdownPostHog();
  process.exit(0);
});

export default app;
