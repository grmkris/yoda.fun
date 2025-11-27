import posthog from "posthog-js";
import { env } from "@/env";

// Only initialize if API key is configured
const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    // Use latest defaults for optimal pageview/pageleave tracking
    defaults: "2025-05-24",
    // Enable session recording
    session_recording: {
      recordCrossOriginIframes: true,
    },
    // Capture performance metrics
    capture_performance: true,
    // Debug mode in development
    loaded: (instance) => {
      if (env.NEXT_PUBLIC_ENV === "dev") {
        instance.debug();
      }
    },
  });
}
