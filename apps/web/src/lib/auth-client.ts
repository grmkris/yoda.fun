import { createAuthWebClient } from "@yoda.fun/auth/auth-client.web";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { env } from "@/env";

export interface SessionWithWallet {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    isAnonymous?: boolean | null;
    createdAt: Date;
    updatedAt: Date;
    emailVerified: boolean;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  walletAddress: string | null;
  chainNamespace: string | null;
  chainId: string | null;
}

export const authClient = createAuthWebClient({
  baseUrl: SERVICE_URLS[env.NEXT_PUBLIC_ENV].auth,
});
