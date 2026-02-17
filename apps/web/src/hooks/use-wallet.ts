"use client";

import { authClient } from "@/lib/auth-client";

export function useIsAuthenticated() {
  const { data: session, isPending } = authClient.useSession();
  return {
    isAuthenticated: !!session?.user,
    isLoading: isPending,
  };
}
