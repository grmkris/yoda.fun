import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import { processAvatarImage } from "@yoda.fun/markets/image-processing";
import type { QueueClient } from "@yoda.fun/queue";
import type { StorageClient } from "@yoda.fun/storage";

export interface AvatarImageWorkerConfig {
  queue: QueueClient;
  db: Database;
  logger: Logger;
  storage: StorageClient;
}

export function createAvatarImageWorker(config: AvatarImageWorkerConfig): {
  close: () => Promise<void>;
} {
  const { queue, db, logger, storage } = config;

  logger.info({ msg: "Starting avatar image worker" });

  const worker = queue.createWorker<"process-avatar-image">(
    "process-avatar-image",
    async (job) => {
      const { userId, sourceKey } = job;

      logger.info({ userId, sourceKey }, "Processing avatar image");

      const imageBlob = await storage.download({ key: sourceKey });
      const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

      const { avatarKey } = await processAvatarImage(imageBuffer, userId, {
        storage,
      });

      await db
        .update(DB_SCHEMA.user)
        .set({ image: avatarKey })
        .where(eq(DB_SCHEMA.user.id, userId));

      await storage.delete({ key: sourceKey });

      logger.info({ userId, avatarKey }, "Avatar image processed successfully");

      return {
        success: true,
        userId,
        avatarKey,
      };
    },
    {
      onFailed: (job, error) => {
        logger.error({
          msg: "Avatar image processing failed after all retries",
          userId: job.userId,
          error: error.message,
        });
        return Promise.resolve();
      },
    }
  );

  return { close: () => worker.close() };
}
