import type { SIWXConfig } from "@reown/appkit";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { createSiweMessage } from "viem/siwe";
import { env } from "@/env";
import { authClient } from "@/lib/auth-client";

const domain = SERVICE_URLS[env.NEXT_PUBLIC_ENV].siweDomain;

export const betterAuthSiwx: SIWXConfig = {
  async createMessage(input) {
    // Parse chainId from CAIP format (e.g., "eip155:8453" -> 8453)
    const chainId = Number.parseInt(input.chainId.split(":")[1] ?? "8453", 10);

    // Get nonce from better-auth (we have address now!)
    const { data } = await authClient.siwe.nonce({
      walletAddress: input.accountAddress,
      chainId,
    });

    if (!data?.nonce) {
      throw new Error("Failed to get nonce from server");
    }

    // Create SIWE message
    const message = createSiweMessage({
      address: input.accountAddress as `0x${string}`,
      chainId,
      domain: domain.startsWith(".") ? domain.slice(1) : domain,
      nonce: data.nonce,
      uri: typeof window !== "undefined" ? window.location.origin : "",
      version: "1",
      statement: "Sign in to yoda.fun",
    });

    return {
      ...input,
      domain,
      uri: typeof window !== "undefined" ? window.location.origin : "",
      version: "1",
      nonce: data.nonce,
      toString: () => message,
    };
  },

  async addSession(session) {
    const chainId = Number.parseInt(
      session.data.chainId.split(":")[1] ?? "8453",
      10
    );

    // Verify with better-auth and create session
    const { error } = await authClient.siwe.verify({
      message: session.message,
      signature: session.signature,
      walletAddress: session.data.accountAddress,
      chainId,
    });

    if (error) {
      throw new Error(error.message ?? "Failed to verify signature");
    }
  },

  async revokeSession(_chainId, _address) {
    await authClient.signOut();
  },

  async setSessions(_sessions) {
    // Not needed - better-auth handles single session
  },

  async getSessions(chainId, address) {
    const { data: session } = await authClient.getSession();

    // Must be authenticated and not anonymous
    if (!session?.user || session.user.isAnonymous) {
      return [];
    }

    // Use wallet from session (populated by customSession plugin)
    const authenticatedWallet = (
      session as { walletAddress?: string }
    ).walletAddress?.toLowerCase();
    if (!authenticatedWallet || authenticatedWallet !== address.toLowerCase()) {
      return [];
    }

    return [
      {
        data: {
          accountAddress: address,
          chainId,
          domain,
          uri: typeof window !== "undefined" ? window.location.origin : "",
          version: "1",
          nonce: "existing-session",
        },
        message: "existing-session",
        signature: "existing-session",
      },
    ];
  },

  signOutOnDisconnect: true,
};
