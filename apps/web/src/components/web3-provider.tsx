"use client";

import { porto } from "porto/wagmi";
import { createConfig, http, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";

const wagmiConfig = createConfig({
  chains: [base],
  connectors: [porto()],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
