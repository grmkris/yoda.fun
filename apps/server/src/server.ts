import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@yoda.fun/api/context";
import { appRouter } from "@yoda.fun/api/routers";
import { createAuth } from "@yoda.fun/auth";
import { createDb, runMigrations } from "@yoda.fun/db";
import { createFhevmClient } from "@yoda.fun/fhevm/sdk/server-client";
import { createLogger } from "@yoda.fun/logger";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { createStorageClient } from "@yoda.fun/storage";
import { S3Client } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "@/env";
import { createMarketIndexer } from "@/indexer/market-indexer";
import {
  captureException,
  createPostHogClient,
  shutdownPostHog,
} from "@/lib/posthog";
import { handleMcpRequest } from "@/mcp/transport";

const logger = createLogger({
  level: env.APP_ENV === "prod" ? "info" : "debug",
  environment: env.APP_ENV,
  appName: "yoda-server",
});

const app = new Hono();

const db = createDb({ dbData: { type: "pg", databaseUrl: env.DATABASE_URL } });
await runMigrations(db, logger);
const auth = createAuth({
  db,
  appEnv: env.APP_ENV,
  secret: env.BETTER_AUTH_SECRET,
});

const posthog = createPostHogClient({
  apiKey: env.POSTHOG_API_KEY,
  host: SERVICE_URLS[env.APP_ENV].posthog,
  logger,
});

const s3Client = new S3Client({
  accessKeyId: env.S3_ACCESS_KEY,
  secretAccessKey: env.S3_SECRET_KEY,
  endpoint: env.S3_ENDPOINT,
  bucket: env.S3_BUCKET,
});

const publicS3Client = new S3Client({
  accessKeyId: env.S3_ACCESS_KEY,
  secretAccessKey: env.S3_SECRET_KEY,
  endpoint: env.S3_ENDPOINT,
  bucket: SERVICE_URLS[env.APP_ENV].publicBucket,
});

const storage = createStorageClient({
  s3Client,
  publicS3Client,
  publicUrl: SERVICE_URLS[env.APP_ENV].publicStorageUrl,
  env: env.APP_ENV,
  logger,
});

// FHEVM client for on-chain prediction markets
const fhevmClient = createFhevmClient({
  privateKey: (env.FHEVM_PRIVATE_KEY ??
    env.YODA_AGENT_PRIVATE_KEY) as `0x${string}`,
  rpcUrl: env.FHEVM_RPC_URL,
});
logger.info({ address: fhevmClient.getAddress() }, "FHEVM client initialized");

// HTTP request logging
app.use(async (c, next) => {
  const start = Date.now();
  const reqId = crypto.randomUUID().slice(0, 8);

  logger.debug({ reqId, method: c.req.method, path: c.req.path }, "request");

  await next();

  const duration = Date.now() - start;
  logger.info(
    {
      reqId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
    },
    "response"
  );
});

app.use(
  "/*",
  cors({
    origin: [SERVICE_URLS[env.APP_ENV].web],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

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

// MCP endpoint for AI agents
app.all("/mcp", (c) => handleMcpRequest(c, { db, logger }));
logger.info({ msg: "MCP endpoint enabled at /mcp" });

const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
});

const rpcHandler = new RPCHandler(appRouter);

app.use("/*", async (c, next) => {
  const context = await createContext({
    context: c,
    auth,
    db,
    logger,
    posthog,
    storage,
    fhevmClient,
  });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/api/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(
      rpcResult.response.body as ReadableStream,
      rpcResult.response
    );
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context,
  });

  if (apiResult.matched) {
    return c.newResponse(
      apiResult.response.body as ReadableStream,
      apiResult.response
    );
  }

  await next();
});

app.get("/", (c) => c.text("OK"));
app.get("/health", (c) => c.text("OK"));

// Start event indexer for on-chain market sync
const indexer = createMarketIndexer({
  db,
  logger,
  rpcUrl: env.FHEVM_RPC_URL,
});
indexer.start().catch((error) => {
  logger.error({ error }, "Failed to start market indexer");
});

process.on("SIGTERM", async () => {
  logger.info({ msg: "Shutting down server..." });
  await indexer.close();
  await shutdownPostHog();
  process.exit(0);
});

export default {
  port: 4200,
  fetch: app.fetch,
};
