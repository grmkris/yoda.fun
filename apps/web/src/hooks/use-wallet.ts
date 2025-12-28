"use client";

import { authClient } from "@/lib/auth-client";

export function useIsAuthenticated() {
  const { data: session, isPending } = authClient.useSession();
  return {
    isAuthenticated: session?.user?.isAnonymous === false,
    isAnonymous: session?.user?.isAnonymous ?? true,
    isLoading: isPending,
  };
}
