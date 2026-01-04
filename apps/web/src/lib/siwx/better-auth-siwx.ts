import type {
  CaipNetworkId,
  SIWXConfig,
  SIWXMessage,
  SIWXSession,
} from "@reown/appkit";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { env } from "@/env";
import { authClient, type SessionWithWallet } from "@/lib/auth-client";

const authBaseUrl = SERVICE_URLS[env.NEXT_PUBLIC_ENV].auth;
const domain = SERVICE_URLS[env.NEXT_PUBLIC_ENV].siweDomain.replace(/^\./, "");

let cachedSession: SIWXSession | null = null;
let lastVerifiedSignature: string | null = null;
let pendingVerification: Promise<void> | null = null;

const NETWORK_NAMES: Record<string, string> = {
  // EVM
  "1": "Ethereum",
  "8453": "Base",
  "84532": "Base Sepolia",
  "137": "Polygon",
  "42161": "Arbitrum",
  "10": "Optimism",
  // Solana (uses genesis hashes as chain IDs)
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": "Solana", // mainnet-beta
  EtWTRABZaYq6iMfeYKouRu166VU2xqa1: "Solana Devnet",
  "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z": "Solana Testnet",
};

function createMessageString(params: SIWXMessage.Data): string {
  const chainIdNum = params.chainId.split(":")[1];
  const networkName = NETWORK_NAMES[chainIdNum ?? ""] || "Ethereum";

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

    const res = await fetch(`${authBaseUrl}/siwx/nonce`, {
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error("Failed to get nonce");
    }
    const { nonce } = await res.json();

    const messageData: SIWXMessage.Data = {
      accountAddress: input.accountAddress,
      chainId: input.chainId,
      notBefore: input.notBefore,
      domain,
      uri: globalThis.location?.origin ?? "",
      version: "1",
      nonce,
      statement: "Sign in to yoda.fun",
      issuedAt: new Date().toISOString(),
    };

    return { ...messageData, toString: () => createMessageString(messageData) };
  },

  addSession: async (session: SIWXSession): Promise<void> => {
    if (lastVerifiedSignature === session.signature) {
      return;
    }

    const { data: authSession } = (await authClient.getSession()) as {
      data: SessionWithWallet | null;
    };
    if (
      authSession?.walletAddress?.toLowerCase() ===
      session.data.accountAddress.toLowerCase()
    ) {
      cachedSession = session;
      lastVerifiedSignature = session.signature;
      return;
    }

    if (pendingVerification) {
      await pendingVerification;
      return;
    }

    const doVerify = async () => {
      const res = await fetch(`${authBaseUrl}/siwx/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: session.message,
          signature: session.signature,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to verify signature");
      }

      lastVerifiedSignature = session.signature;
      cachedSession = session;
    };

    pendingVerification = doVerify();
    try {
      await pendingVerification;
    } finally {
      pendingVerification = null;
    }
  },

  getSessions: async (
    chainId: CaipNetworkId,
    address: string
  ): Promise<SIWXSession[]> => {
    if (
      cachedSession?.data.chainId === chainId &&
      cachedSession.data.accountAddress.toLowerCase() === address.toLowerCase()
    ) {
      return [cachedSession];
    }

    const res = await fetch(`${authBaseUrl}/siwx/sessions`, {
      credentials: "include",
    });

    if (!res.ok) {
      return [];
    }

    const { sessions } = await res.json();
    return sessions.filter(
      (s: SIWXSession) =>
        s.data.chainId === chainId &&
        s.data.accountAddress.toLowerCase() === address.toLowerCase()
    );
  },

  revokeSession: async (): Promise<void> => {
    cachedSession = null;
    lastVerifiedSignature = null;
    await authClient.signOut();
  },

  setSessions: (): Promise<void> => {
    throw new Error(
      "setSessions not implemented - sessions managed by better-auth"
    );
  },

  getRequired: () => true,
};
