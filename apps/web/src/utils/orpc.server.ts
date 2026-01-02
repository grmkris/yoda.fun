import "server-only";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@yoda.fun/api/routers";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { headers } from "next/headers";
import { env } from "@/env";

const serverLink = new RPCLink({
  url: `${SERVICE_URLS[env.NEXT_PUBLIC_ENV].apiInternal}/api/rpc`,
  fetch(_url, options) {
    return fetch(_url, {
      ...options,
      credentials: "include",
    });
  },
  headers: async () => Object.fromEntries(await headers()),
});

export const serverClient: AppRouterClient = createORPCClient(serverLink);
export const serverOrpc = createTanstackQueryUtils(serverClient);
