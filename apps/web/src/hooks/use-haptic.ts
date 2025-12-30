"use client";

import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { useCallback } from "react";

type HapticPattern = "threshold" | "swipeComplete" | "error";

const { haptic } = NUMERIC_CONSTANTS.swipe;

export function useHaptic() {
  const vibrate = useCallback((pattern: HapticPattern) => {
    if (typeof navigator === "undefined" || !navigator.vibrate) {
      return;
    }

    const duration = haptic[pattern];

    try {
      navigator.vibrate(duration);
    } catch {
      // Silently fail - haptic is enhancement, not critical
    }
  }, []);

  const vibrateOnThreshold = useCallback(() => vibrate("threshold"), [vibrate]);
  const vibrateOnSwipe = useCallback(() => vibrate("swipeComplete"), [vibrate]);
  const vibrateOnError = useCallback(() => vibrate("error"), [vibrate]);

  return {
    vibrate,
    vibrateOnThreshold,
    vibrateOnSwipe,
    vibrateOnError,
    isSupported: typeof navigator !== "undefined" && "vibrate" in navigator,
  };
}
