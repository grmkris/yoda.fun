"use client";

import type { Network } from "@yoda.fun/shared/constants";
import { ENV_CONFIG } from "@yoda.fun/shared/constants";
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

const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [porto()],
  transports: {
    [chain.id]: http(),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
