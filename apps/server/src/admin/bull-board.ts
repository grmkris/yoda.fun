import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import type { QueueClient } from "@yoda.fun/queue";
import { serveStatic } from "hono/bun";

export function setupBullBoard(queueClient: QueueClient) {
  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath("/admin/queues");

  const { addQueue, removeQueue } = createBullBoard({
    queues: [
      new BullMQAdapter(queueClient.queues["generate-market"]),
      new BullMQAdapter(queueClient.queues["resolve-market"]),
    ],
    serverAdapter,
  });

  return { serverAdapter, addQueue, removeQueue };
}
