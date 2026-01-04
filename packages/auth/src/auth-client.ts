import type { Auth } from "@yoda.fun/auth";
import {
  anonymousClient,
  customSessionClient,
  inferAdditionalFields,
  siweClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

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
      siweClient(),
      customSessionClient<Auth & { Session: CustomSessionFields }>(),
    ],
  });
