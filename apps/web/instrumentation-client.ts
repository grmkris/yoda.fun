import { SERVICE_URLS } from "@yoda.fun/shared/services";
import posthog from "posthog-js";
import { env } from "@/env";

const services = SERVICE_URLS[env.NEXT_PUBLIC_ENV];

// Only initialize if API key is configured
const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY;

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: "/_ph",
    ui_host: services.posthogUi,
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
