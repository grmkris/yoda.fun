import "server-only";

import { createAuthWebClient } from "@yoda.fun/auth/auth-client.web";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { headers } from "next/headers";
import { cache } from "react";
import { env } from "@/env";

/**
 * Auth client for server components and server actions.
 * Uses internal Docker URL (http://server:3000 in prod).
 *
 * For client components, use `authClient` from `@/lib/auth`.
 */
export const authServerClient = createAuthWebClient({
  baseUrl: SERVICE_URLS[env.NEXT_PUBLIC_ENV].authInternal,
});

/**
 * Cached session getter - dedupes within a single render pass.
 * Call this from any server component - only executes once per request.
 *
 * @example
 * const session = await getSession()
 * if (!session?.user) redirect('/login')
 */
export const getSession = cache(async () => {
  const h = await headers();
  const result = await authServerClient.getSession({
    fetchOptions: { headers: h },
  });
  return result.data; // Unwrap { data, error } to return { session, user } directly
});
