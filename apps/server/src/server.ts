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
import { ENV_CONFIG, MARKET_GENERATION } from "@yoda.fun/shared/constants";
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
import { createMarketGenerationWorker } from "@/workers/market-generation.worker";
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
  environment: env.APP_ENV,
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
const envConfig = ENV_CONFIG[env.APP_ENV];
if (envConfig.depositWalletAddress) {
  const depositRoutes = createDepositRoutes({
    db,
    auth,
    logger,
    depositWalletAddress: envConfig.depositWalletAddress,
    network: envConfig.network,
  });
  app.route("/api", depositRoutes);
  logger.info({ network: envConfig.network }, "x402 deposit routes enabled");
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

// Initialize queue and workers (auto-start if REDIS_URL is configured)
let queue: QueueClient | undefined;
let resolutionWorker: { close: () => Promise<void> } | undefined;
let generationWorker: { close: () => Promise<void> } | undefined;

if (env.REDIS_URL && env.GOOGLE_GEMINI_API_KEY) {
  queue = createQueueClient({
    url: env.REDIS_URL,
    logger,
  });

  const aiClient = createAiClient({
    logger,
    environment: env.APP_ENV,
    posthog,
    providerConfigs: {
      xaiApiKey: env.GOOGLE_GEMINI_API_KEY,
    },
  });

  // Start resolution worker
  resolutionWorker = createMarketResolutionWorker({
    queue,
    db,
    logger,
    aiClient,
  });
  logger.info({ msg: "Market resolution worker started" });

  // Start generation worker
  generationWorker = createMarketGenerationWorker({
    queue,
    db,
    logger,
    aiClient,
  });

  // Schedule recurring market generation using BullMQ repeatable jobs
  queue
    .addJob(
      "generate-market",
      {
        count: MARKET_GENERATION.COUNT,
        trigger: "scheduled",
      },
      {
        repeat: { pattern: MARKET_GENERATION.CRON },
      }
    )
    .then(() => {
      logger.info({
        msg: "Market generation scheduled",
        cron: MARKET_GENERATION.CRON,
        count: MARKET_GENERATION.COUNT,
      });
    })
    .catch((err) => {
      logger.error({ err }, "Failed to schedule market generation");
    });

  logger.info({ msg: "Market generation worker started" });
}

// Export queue for use in other modules (e.g., market creation)
export { queue };

// Graceful shutdown handler
process.on("SIGTERM", async () => {
  logger.info({ msg: "Shutting down server..." });
  await resolutionWorker?.close();
  await generationWorker?.close();
  await queue?.close();
  await shutdownPostHog();
  process.exit(0);
});

export default app;
