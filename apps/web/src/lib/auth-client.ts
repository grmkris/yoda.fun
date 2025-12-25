import type { Auth } from "@yoda.fun/auth";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import {
  anonymousClient,
  inferAdditionalFields,
  siweClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "@/env";

export const authClient = createAuthClient({
  baseURL: SERVICE_URLS[env.NEXT_PUBLIC_ENV].auth,
  plugins: [anonymousClient(), inferAdditionalFields<Auth>(), siweClient()],
});
