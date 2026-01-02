import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import type { AppRouterClient } from "@yoda.fun/api/routers";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { toast } from "sonner";
import { env } from "@/env";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

const getApiUrl = () => {
  if (env.NEXT_PUBLIC_ENV === "dev") {
    return `${SERVICE_URLS.dev.api}/rpc`;
  }
  return "/api/rpc"; // Proxied in prod
};

export const link = new RPCLink({
  url: getApiUrl(),
  fetch(_url, options) {
    return fetch(_url, {
      ...options,
      credentials: "include",
    });
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
