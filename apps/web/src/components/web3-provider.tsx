"use client";

import { base, baseSepolia, solana } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { SolanaAdapter } from "@reown/appkit-adapter-solana";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { cookieStorage, createStorage, WagmiProvider } from "wagmi";
import { env } from "@/env";
import { betterAuthSiwx } from "@/lib/siwx/better-auth-siwx";

const chain = base;
const erc8004Chain = baseSepolia; // For ERC-8004 feedback on testnet
const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// WagmiAdapter for EVM chains (Base mainnet + Base Sepolia for ERC-8004)
const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks: [chain, erc8004Chain],
});

// SolanaAdapter for Solana
const solanaAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});

// Initialize AppKit with both EVM and Solana adapters
createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  projectId,
  networks: [base, baseSepolia, solana],
  features: { analytics: false },
  siwx: betterAuthSiwx,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>{children}</WagmiProvider>
  );
}
