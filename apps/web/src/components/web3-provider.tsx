"use client";

import { base, baseSepolia } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { Network } from "@yoda.fun/shared/constants";
import { ENV_CONFIG } from "@yoda.fun/shared/constants";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { porto } from "porto/wagmi";
import type { CreateConnectorFn } from "wagmi";
import { cookieStorage, createStorage, WagmiProvider } from "wagmi";
import { env } from "@/env";

const NETWORKS: Record<Network, typeof base | typeof baseSepolia> = {
  base,
  "base-sepolia": baseSepolia,
};

const network = ENV_CONFIG[env.NEXT_PUBLIC_ENV].network;
const chain = NETWORKS[network];
const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const baseUrl = SERVICE_URLS[env.NEXT_PUBLIC_ENV].auth;

// Porto as custom connector
const connectors: CreateConnectorFn[] = [
  porto({
    authUrl: {
      logout: `${baseUrl}/api/auth/sign-out`,
      nonce: `${baseUrl}/api/auth/siwe/nonce`,
      verify: `${baseUrl}/api/auth/siwe/verify`,
    },
  }),
];

// WagmiAdapter creates shared config
const wagmiAdapter = new WagmiAdapter({
  connectors,
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
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>{children}</WagmiProvider>
  );
}
