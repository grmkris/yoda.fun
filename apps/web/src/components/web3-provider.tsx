"use client";

import { base, solana } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { SolanaAdapter } from "@reown/appkit-adapter-solana";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import type { Network } from "@yoda.fun/shared/constants";
import { ENV_CONFIG } from "@yoda.fun/shared/constants";
import { cookieStorage, createStorage, WagmiProvider } from "wagmi";
import { env } from "@/env";
import { betterAuthSiwx } from "@/lib/siwx/better-auth-siwx";

const NETWORKS: Record<Network, typeof base> = {
  base,
};

const network = ENV_CONFIG[env.NEXT_PUBLIC_ENV].network;
const chain = NETWORKS[network];
const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// WagmiAdapter for EVM chains
const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks: [chain],
});

// SolanaAdapter for Solana
const solanaAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});

// Initialize AppKit with both EVM and Solana adapters
createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  projectId,
  networks: [base, solana],
  features: { analytics: false },
  siwx: betterAuthSiwx,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>{children}</WagmiProvider>
  );
}
