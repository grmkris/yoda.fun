import "server-only";

import { createAuthServerClient } from "@yoda.fun/auth/auth-client.server";
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
export const authServerClient = createAuthServerClient({
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
    fetchOptions: {
      headers: h,
      baseURL: SERVICE_URLS[env.NEXT_PUBLIC_ENV].authInternal, // this is needed because the auth client is not aware of the baseURL ( i think fetch options overwrites waht we defined in the auth client)
    },
  });
  return result.data; // Unwrap { data, error } to return { session, user } directly
});
