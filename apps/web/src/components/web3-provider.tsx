"use client";

import type { Network } from "@yoda.fun/shared/constants";
import { ENV_CONFIG } from "@yoda.fun/shared/constants";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import { porto } from "porto/wagmi";
import type { Chain } from "viem";
import { createConfig, http, WagmiProvider } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { env } from "@/env";

const CHAINS: Record<Network, Chain> = {
  base,
  "base-sepolia": baseSepolia,
};

const network = ENV_CONFIG[env.NEXT_PUBLIC_ENV].network;
const chain = CHAINS[network];
const baseUrl = SERVICE_URLS[env.NEXT_PUBLIC_ENV].auth;

const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    porto({
      authUrl: {
        logout: `${baseUrl}/api/auth/sign-out`,
        nonce: `${baseUrl}/api/auth/siwe/nonce`,
        verify: `${baseUrl}/api/auth/siwe/verify`,
      },
    }),
  ],
  transports: {
    [chain.id]: http(),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
