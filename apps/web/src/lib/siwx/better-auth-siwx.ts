import type {
  CaipNetworkId,
  SIWXConfig,
  SIWXMessage,
  SIWXSession,
} from "@reown/appkit";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { env } from "@/env";
import { authClient, type SessionWithWallet } from "@/lib/auth-client";

const domain = SERVICE_URLS[env.NEXT_PUBLIC_ENV].siweDomain.replace(/^\./, "");

const NETWORK_NAMES: Record<string, string> = {
  "8453": "Base",
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": "Solana",
};

function createMessageString(params: SIWXMessage.Data): string {
  const chainIdNum = params.chainId.split(":")[1];
  const networkName = NETWORK_NAMES[chainIdNum ?? ""] || "Base";

  return [
    `${params.domain} wants you to sign in with your ${networkName} account:`,
    params.accountAddress,
    params.statement ? `\n${params.statement}\n` : "",
    `URI: ${params.uri}`,
    `Version: ${params.version}`,
    `Chain ID: ${chainIdNum}`,
    `Nonce: ${params.nonce}`,
    params.issuedAt && `Issued At: ${params.issuedAt}`,
    params.expirationTime && `Expiration Time: ${params.expirationTime}`,
    params.notBefore && `Not Before: ${params.notBefore}`,
    params.requestId && `Request ID: ${params.requestId}`,
    params.resources?.length &&
      params.resources.reduce(
        (acc, resource) => `${acc}\n- ${resource}`,
        "Resources:"
      ),
  ]
    .filter((line) => typeof line === "string")
    .join("\n")
    .trim();
}

export const betterAuthSiwx: SIWXConfig = {
  createMessage: async (input: SIWXMessage.Input): Promise<SIWXMessage> => {
    const { data: session } = (await authClient.getSession()) as {
      data: SessionWithWallet | null;
    };

    const isPlaceholder = input.accountAddress.includes("<<");
    const alreadyAuthenticated =
      session?.walletAddress?.toLowerCase() ===
        input.accountAddress.toLowerCase() || isPlaceholder;

    if (session?.walletAddress && alreadyAuthenticated) {
      const messageData: SIWXMessage.Data = {
        accountAddress: input.accountAddress,
        chainId: input.chainId,
        notBefore: input.notBefore,
        domain,
        uri: globalThis.location?.origin ?? "",
        version: "1",
        nonce: "already-authenticated",
        statement: "Sign in to yoda.fun",
        issuedAt: new Date().toISOString(),
      };
      return {
        ...messageData,
        toString: () => createMessageString(messageData),
      };
    }

    const { data, error } = await authClient.siwx.nonce();
    if (error || !data?.nonce) {
      throw new Error("Failed to get nonce");
    }

    const messageData: SIWXMessage.Data = {
      accountAddress: input.accountAddress,
      chainId: input.chainId,
      notBefore: input.notBefore,
      domain,
      uri: globalThis.location?.origin ?? "",
      version: "1",
      nonce: data.nonce,
      statement: "Sign in to yoda.fun",
      issuedAt: new Date().toISOString(),
    };

    return { ...messageData, toString: () => createMessageString(messageData) };
  },

  addSession: async (session: SIWXSession): Promise<void> => {
    const { data: authSession } = (await authClient.getSession()) as {
      data: SessionWithWallet | null;
    };

    if (
      authSession?.walletAddress?.toLowerCase() ===
      session.data.accountAddress.toLowerCase()
    ) {
      return;
    }

    const { error } = await authClient.siwx.verify({
      message: session.message,
      signature: session.signature,
    });

    if (error) {
      throw new Error(error.message || "Failed to verify signature");
    }
  },

  getSessions: async (
    chainId: CaipNetworkId,
    address: string
  ): Promise<SIWXSession[]> => {
    const { data: session } = (await authClient.getSession()) as {
      data: SessionWithWallet | null;
    };

    if (
      !(session?.walletAddress && session.chainNamespace && session.chainId)
    ) {
      return [];
    }

    const sessionChainId = `${session.chainNamespace}:${session.chainId}`;

    if (
      sessionChainId !== chainId ||
      session.walletAddress.toLowerCase() !== address.toLowerCase()
    ) {
      return [];
    }

    if (!(session.walletAddress && session.chainNamespace && session.chainId)) {
      return [];
    }
    return [
      {
        data: {
          accountAddress: session.walletAddress,
          chainId: sessionChainId,
          domain,
          uri: globalThis.location?.origin ?? "",
          version: "1",
          nonce: "session-restored",
          statement: "Sign in to yoda.fun",
          issuedAt: new Date().toISOString(),
        },
        message: `${domain} wants you to sign in with your account:\n${session.walletAddress}`,
        signature: "session-restored",
      },
    ];
  },

  revokeSession: async (): Promise<void> => {
    await authClient.signOut();
  },

  setSessions: (): Promise<void> => {
    throw new Error(
      "setSessions not implemented - sessions managed by better-auth"
    );
  },

  getRequired: () => true,
};
