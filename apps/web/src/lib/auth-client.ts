import { createAuthWebClient } from "@yoda.fun/auth/auth-client.web";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { env } from "@/env";

export const authClient = createAuthWebClient({
  baseUrl: SERVICE_URLS[env.NEXT_PUBLIC_ENV].auth,
});
