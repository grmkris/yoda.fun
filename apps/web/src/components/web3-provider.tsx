"use client";

import { sepolia } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { cookieStorage, createStorage, WagmiProvider } from "wagmi";
import { env } from "@/env";
import { betterAuthSiwx } from "@/lib/siwx/better-auth-siwx";

const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks: [sepolia],
});

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [sepolia],
  features: { analytics: false },
  siwx: betterAuthSiwx,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>{children}</WagmiProvider>
  );
}
