"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";

export function MiniAppReady() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);
  return null;
}
