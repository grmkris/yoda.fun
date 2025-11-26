"use client";

import { PostHogProvider as PHProvider, usePostHog } from "@posthog/react";
import posthog from "posthog-js";
import { useEffect } from "react";

type PostHogProviderProps = {
  children: React.ReactNode;
};

/**
 * PostHog provider that wraps the app for React hook support.
 * Initialization happens in instrumentation-client.ts.
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}

/**
 * Hook to identify users after authentication.
 * Call this in your auth success handler or user session component.
 */
export function usePostHogIdentify(
  user: {
    id: string;
    email?: string;
    walletAddress?: string;
  } | null
) {
  const posthogClient = usePostHog();

  useEffect(() => {
    if (user) {
      posthogClient.identify(user.id, {
        email: user.email,
        walletAddress: user.walletAddress,
      });
    } else {
      posthogClient.reset();
    }
  }, [user, posthogClient]);
}
