"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { http, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { env } from "@/env";
import { queryClient } from "@/utils/orpc";

const wagmiConfig = getDefaultConfig({
  appName: "yoda.fun",
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
  // @ts-expect-error - getDefaultConfig doesn't expose queryClient in types but accepts it
  queryClient,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider>{children}</RainbowKitProvider>
    </WagmiProvider>
  );
}
