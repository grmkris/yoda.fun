"use client";

import { Chains } from "porto";
import { porto } from "porto/wagmi";
import { createConfig, http, WagmiProvider } from "wagmi";

const wagmiConfig = createConfig({
  chains: [Chains.baseSepolia],
  connectors: [porto()],
  transports: {
    [Chains.baseSepolia.id]: http(),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
