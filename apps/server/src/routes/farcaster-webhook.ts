import type { Logger } from "@yoda.fun/logger";
import { Hono } from "hono";

interface FarcasterWebhookDeps {
  logger: Logger;
}

export function createFarcasterWebhookRoutes(deps: FarcasterWebhookDeps) {
  const { logger } = deps;
  const app = new Hono();

  app.post("/farcaster", async (c) => {
    const body = await c.req.json();

    // TODO: Verify webhook signature when Farcaster provides one

    logger.info({ event: body }, "Farcaster webhook received");

    // Handle different notification types
    // e.g., cast_mention, follow, etc.

    return c.json({ success: true });
  });

  return app;
}
