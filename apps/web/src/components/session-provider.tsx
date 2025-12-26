"use client";

import { authClient } from "@/lib/auth-client";

// Re-export better-auth's built-in useSession hook
export const useSession = authClient.useSession;
