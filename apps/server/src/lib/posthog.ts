import type { Logger } from "@yoda.fun/logger";
import { PostHog } from "posthog-node";

type CreatePostHogClientOptions = {
  apiKey?: string;
  host?: string;
  logger?: Logger;
};

let instance: PostHog | undefined;

export function createPostHogClient(
  options: CreatePostHogClientOptions
): PostHog | undefined {
  const { apiKey, host, logger } = options;

  if (!(apiKey && host)) {
    logger?.info({ msg: "PostHog not configured, analytics disabled" });
    return;
  }

  if (instance) {
    return instance;
  }

  instance = new PostHog(apiKey, {
    host,
    // Serverless-optimized: flush immediately
    flushAt: 1,
    flushInterval: 0,
  });

  logger?.info({ msg: "PostHog client initialized", host });

  return instance;
}

export async function shutdownPostHog(): Promise<void> {
  if (instance) {
    await instance.shutdown();
    instance = undefined;
  }
}

export async function captureException(
  error: Error,
  distinctId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (instance) {
    instance.captureException(error, distinctId, properties);
    await instance.flush();
  }
}
