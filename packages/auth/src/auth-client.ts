import type { Auth } from "@yoda.fun/auth";
import {
  anonymousClient,
  customSessionClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { siwxClient } from "./plugins/siwx";

export interface CustomSessionFields {
  walletAddress: string | null;
  chainNamespace: string | null;
  chainId: string | null;
}

export const createAuthWebClient = (props: { baseUrl: string }) =>
  createAuthClient({
    baseUrl: props.baseUrl,
    plugins: [
      anonymousClient(),
      inferAdditionalFields<Auth>(),
      siwxClient(),
      customSessionClient<Auth & { Session: CustomSessionFields }>(),
    ],
  });
