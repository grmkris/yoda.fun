"use client";

import { base, baseSepolia } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { Network } from "@yoda.fun/shared/constants";
import { ENV_CONFIG } from "@yoda.fun/shared/constants";
import { cookieStorage, createStorage, WagmiProvider } from "wagmi";
import { env } from "@/env";
import { betterAuthSiwx } from "@/lib/siwx/better-auth-siwx";

const NETWORKS: Record<Network, typeof base | typeof baseSepolia> = {
  base,
  "base-sepolia": baseSepolia,
};

const network = ENV_CONFIG[env.NEXT_PUBLIC_ENV].network;
const chain = NETWORKS[network];
const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// WagmiAdapter creates shared config
const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks: [chain],
});

// Initialize AppKit (provides WalletConnect modal + more wallets)
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [base, baseSepolia],
  features: { analytics: false },
  siwx: betterAuthSiwx,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>{children}</WagmiProvider>
  );
}
