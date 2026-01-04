import type { BetterAuthPlugin, User } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { createPublicClient, http } from "viem";
import { generateSiweNonce } from "viem/siwe";
import { z } from "zod";

const ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/;
const CHAIN_ID_REGEX = /Chain ID:\s*(\d+)/;
const NONCE_REGEX = /Nonce:\s*(\S+)/;

const CHAIN_RPC_URLS: Record<string, string> = {
  "8453": "https://mainnet.base.org",
  "84532": "https://sepolia.base.org",
  "1": "https://eth.llamarpc.com",
};

async function verifySiweSignature(
  address: string,
  message: string,
  signature: string,
  chainId: string
): Promise<boolean> {
  const rpcUrl = CHAIN_RPC_URLS[chainId];
  if (!rpcUrl) return false;

  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    return await client.verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

const NONCE_COOKIE = "siwx-nonce";
const NONCE_COOKIE_REGEX = new RegExp(`${NONCE_COOKIE}=([^;]+)`);
const NONCE_MAX_AGE = 300; // 5 minutes

export interface SIWXOptions {
  emailDomainName?: string;
  cookieDomain?: string;
}

const schema = {
  walletAddress: {
    fields: {
      userId: {
        type: "string",
        references: { model: "user", field: "id" },
        required: true,
      },
      address: { type: "string", required: true },
      chainNamespace: { type: "string", required: true }, // "eip155" | "solana" | "bip122"
      chainId: { type: "string", required: true },
      isPrimary: { type: "boolean", defaultValue: false },
      createdAt: { type: "date", required: true },
      siwxMessage: { type: "string" },
      siwxSignature: { type: "string" },
    },
  },
} as const;

export const siwx = (options: SIWXOptions) => {
  return {
    id: "siwx",
    schema,
    endpoints: {
      getNonce: createAuthEndpoint("/siwx/nonce", { method: "GET" }, (ctx) => {
        const nonce = generateSiweNonce();
        ctx.setCookie(NONCE_COOKIE, nonce, {
          maxAge: NONCE_MAX_AGE,
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          domain: options.cookieDomain,
        });
        return ctx.json({ nonce });
      }),

      verify: createAuthEndpoint(
        "/siwx/verify",
        {
          method: "POST",
          body: z.object({
            message: z.string().min(1),
            signature: z.string().min(1),
          }),
        },
        async (ctx) => {
          const { message, signature } = ctx.body;

          const cookieHeader = ctx.headers?.get("cookie") || "";
          const storedNonce = cookieHeader.match(NONCE_COOKIE_REGEX)?.[1];
          if (!storedNonce) {
            throw new APIError("BAD_REQUEST", {
              message: "Nonce expired or missing",
            });
          }

          const parsedAddress = message.match(ADDRESS_REGEX)?.[0];
          const parsedChainId = message.match(CHAIN_ID_REGEX)?.[1];
          const parsedNonce = message.match(NONCE_REGEX)?.[1];

          if (!(parsedAddress && parsedChainId && parsedNonce)) {
            throw new APIError("BAD_REQUEST", {
              message: "Invalid SIWE message",
            });
          }
          if (parsedNonce !== storedNonce) {
            throw new APIError("BAD_REQUEST", { message: "Nonce mismatch" });
          }

          const isValid = await verifySiweSignature(
            parsedAddress,
            message,
            signature,
            parsedChainId
          );
          if (!isValid) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid signature",
            });
          }

          const address = parsedAddress.toLowerCase();
          const chainNamespace = "eip155";

          const existingWallet = await ctx.context.adapter.findOne<{
            userId: string;
          }>({
            model: "walletAddress",
            where: [
              { field: "address", operator: "eq", value: address },
              {
                field: "chainNamespace",
                operator: "eq",
                value: chainNamespace,
              },
            ],
          });

          let user: User | null = null;
          if (existingWallet) {
            user = await ctx.context.adapter.findOne<User>({
              model: "user",
              where: [
                { field: "id", operator: "eq", value: existingWallet.userId },
              ],
            });

            if (user) {
              await ctx.context.adapter.updateMany({
                model: "walletAddress",
                where: [
                  { field: "address", operator: "eq", value: address },
                  {
                    field: "chainNamespace",
                    operator: "eq",
                    value: chainNamespace,
                  },
                ],
                update: { siwxMessage: message, siwxSignature: signature },
              });
            }
          }

          if (!user) {
            user = await ctx.context.internalAdapter.createUser({
              name: parsedAddress,
              email: `${address}@${options.emailDomainName || "wallet.local"}`,
              emailVerified: true,
            });

            await ctx.context.adapter.create({
              model: "walletAddress",
              data: {
                userId: user.id,
                address,
                chainNamespace,
                chainId: parsedChainId,
                isPrimary: true,
                createdAt: new Date(),
                siwxMessage: message,
                siwxSignature: signature,
              },
            });

            await ctx.context.internalAdapter.linkAccount({
              userId: user.id,
              providerId: "siwx",
              accountId: `${chainNamespace}:${parsedChainId}:${address}`,
            });
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id
          );
          await setSessionCookie(ctx, { session, user });

          ctx.setCookie(NONCE_COOKIE, "", {
            maxAge: 0,
            path: "/",
            domain: options.cookieDomain,
          });

          return ctx.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email },
          });
        }
      ),

      getSessions: createAuthEndpoint(
        "/siwx/sessions",
        { method: "GET" },
        async (ctx) => {
          const userId = ctx.context.session?.user?.id;
          if (!userId) return ctx.json({ sessions: [] });

          const wallets = await ctx.context.adapter.findMany<{
            address: string;
            chainNamespace: string;
            chainId: string;
            siwxMessage: string | null;
            siwxSignature: string | null;
          }>({
            model: "walletAddress",
            where: [{ field: "userId", operator: "eq", value: userId }],
          });

          const sessions = wallets
            .filter((w) => w.siwxMessage && w.siwxSignature)
            .map((w) => ({
              data: {
                accountAddress: w.address,
                chainId: `${w.chainNamespace}:${w.chainId}`,
                domain: options.emailDomainName?.replace("@", "") || "yoda.fun",
                uri: ctx.headers?.get("origin") || "",
                version: "1",
                nonce: "stored-session",
              },
              message: w.siwxMessage,
              signature: w.siwxSignature,
            }));

          return ctx.json({ sessions });
        }
      ),
    },
  } satisfies BetterAuthPlugin;
};
