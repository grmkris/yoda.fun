import { createAuthWebClient } from "@yoda.fun/auth/auth-client.web";

export const authClient = createAuthWebClient({
  basePath: "/api/auth",
});
