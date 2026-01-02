import type { Auth } from "@yoda.fun/auth";
import {
  anonymousClient,
  customSessionClient,
  inferAdditionalFields,
  siweClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const createAuthWebClient = (props: {
  baseUrl?: string;
  basePath?: string;
}) =>
  createAuthClient({
    baseUrl: props.baseUrl,
    basePath: props.basePath,
    plugins: [
      anonymousClient(),
      inferAdditionalFields<Auth>(),
      siweClient(),
      customSessionClient<Auth>(),
    ],
  });
