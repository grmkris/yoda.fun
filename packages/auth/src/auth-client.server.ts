import type { Auth } from "@yoda.fun/auth";
import { createAuthClient } from "better-auth/client";
import {
  anonymousClient,
  customSessionClient,
  inferAdditionalFields,
  siweClient,
} from "better-auth/client/plugins";

export const createAuthServerClient = (props: { baseUrl: string }) => {
  return createAuthClient({
    baseUrl: props.baseUrl,
    plugins: [
      anonymousClient(),
      inferAdditionalFields<Auth>(),
      siweClient(),
      customSessionClient<Auth>(),
    ],
  });
};
