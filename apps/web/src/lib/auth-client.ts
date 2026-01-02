import type { Auth } from "@yoda.fun/auth";
import {
  anonymousClient,
  customSessionClient,
  inferAdditionalFields,
  siweClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/api/auth",
  plugins: [
    anonymousClient(),
    inferAdditionalFields<Auth>(),
    siweClient(),
    customSessionClient<Auth>(),
  ],
});
