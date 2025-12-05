import type { Logger } from "@yoda.fun/logger";
import { type JobType, WORKER_CONFIG } from "@yoda.fun/shared/constants";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import type { GenerateMarketJob } from "./jobs/generate-market-job";
import type { ResolveMarketJob } from "./jobs/resolve-market-job";

export type QueueConfig = {
  url: string;
  logger?: Logger;
};

export type JobData = {
  "resolve-market": ResolveMarketJob;
  "generate-market": GenerateMarketJob;
};

export type JobResult = {
  "resolve-market": { success: boolean; marketId: string };
  "generate-market": { success: boolean; marketsCreated: number };
};

const TIME_SECONDS = {
  ONE_DAY: 24 * 60 * 60,
  ONE_WEEK: 7 * 24 * 60 * 60,
};

export function createQueueClient(config: QueueConfig) {
  const { url, logger } = config;
  const redis = new Redis(url, { maxRetriesPerRequest: null });

  // Suppress connection errors during shutdown
  redis.on("error", (err) => {
    if (!err.message.includes("Connection is closed")) {
      logger?.error({ msg: "Redis connection error", error: err });
    }
  });

  const connection = redis;

  // Default job options shared across queues
  const defaultJobOptions = {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: TIME_SECONDS.ONE_DAY,
    },
    removeOnFail: {
      count: 1000,
      age: TIME_SECONDS.ONE_WEEK,
    },
  };

  // Track workers for cleanup
  const workers: Worker[] = [];

  // Create queues
  const queues = {
    "resolve-market": new Queue<ResolveMarketJob>("resolve-market", {
      connection,
      defaultJobOptions,
    }),
    "generate-market": new Queue<GenerateMarketJob>("generate-market", {
      connection,
      defaultJobOptions,
    }),
  };

  /**
   * Add a job to a queue
   * Use `delay` option to schedule for future execution
   */
  async function addJob<T extends JobType>(
    queueName: T,
    data: JobData[T],
    options?: {
      priority?: number;
      delay?: number;
      repeat?: { pattern: string };
    }
  ) {
    try {
      logger?.debug({ msg: "Adding job to queue", queueName, data });

      const jobOptions = {
        priority: options?.priority,
        delay: options?.delay,
        repeat: options?.repeat,
      };

      // Type-narrow by queue name for proper typing
      let jobId: string | undefined;

      if (queueName === "resolve-market") {
        const job = await queues["resolve-market"].add(
          queueName,
          data as ResolveMarketJob,
          jobOptions
        );
        jobId = job.id;
      } else if (queueName === "generate-market") {
        const job = await queues["generate-market"].add(
          queueName,
          data as GenerateMarketJob,
          jobOptions
        );
        jobId = job.id;
      } else {
        const _exhaustive: never = queueName;
        throw new Error(`Unknown queue type: ${_exhaustive}`);
      }

      logger?.info({
        msg: "Job added successfully",
        queueName,
        jobId,
        delay: options?.delay,
        repeat: options?.repeat?.pattern,
      });

      return { jobId, queue: queueName };
    } catch (error) {
      logger?.error({ msg: "Failed to add job", queueName, error });
      throw new Error(`Failed to add job to queue: ${queueName}`);
    }
  }

  /**
   * Create a worker for processing jobs
   */
  function createWorker<T extends JobType>(
    queueName: T,
    processor: (job: JobData[T]) => Promise<JobResult[T]>,
    options?: {
      concurrency?: number;
      onFailed?: (job: JobData[T], error: Error) => Promise<void>;
    }
  ) {
    const worker = new Worker<JobData[T], JobResult[T]>(
      queueName,
      async (job) => {
        logger?.info({ msg: "Processing job", queueName, jobId: job.id });

        try {
          const result = await processor(job.data);
          logger?.info({ msg: "Job completed", queueName, jobId: job.id });
          return result;
        } catch (error) {
          logger?.error({ msg: "Job failed", queueName, jobId: job.id, error });
          throw error;
        }
      },
      {
        connection,
        concurrency:
          options?.concurrency ?? WORKER_CONFIG.CONCURRENCY[queueName],
        limiter: WORKER_CONFIG.RATE_LIMITS[queueName],
      }
    );

    worker.on("failed", async (job, error) => {
      logger?.error({
        msg: "Job failed permanently after all retries",
        queueName,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error,
      });

      if (options?.onFailed && job) {
        try {
          await options.onFailed(job.data, error);
        } catch (callbackError) {
          logger?.error({
            msg: "Failure callback error",
            queueName,
            jobId: job.id,
            error: callbackError,
          });
        }
      }
    });

    worker.on("error", (error) => {
      logger?.error({ msg: "Worker error", queueName, error });
    });

    workers.push(worker);
    return worker;
  }

  /**
   * Get job status
   */
  async function getJobStatus<T extends JobType>(queueName: T, jobId: string) {
    const queue = queues[queueName];
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      jobId: job.id,
      state,
      progress: job.progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Close all queue connections
   */
  async function close() {
    logger?.info({ msg: "Closing queue connections" });
    await Promise.all(workers.map((w) => w.close()));
    await Promise.all(Object.values(queues).map((q) => q.close()));
    // Use disconnect() for faster shutdown without waiting for pending replies
    redis.disconnect();
    logger?.info({ msg: "Queue connections closed" });
  }

  return {
    addJob,
    createWorker,
    getJobStatus,
    close,
    queues,
  };
}

export type QueueClient = ReturnType<typeof createQueueClient>;
