import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const YODA_DIR = join(homedir(), ".yoda");
const WALLET_PATH = join(YODA_DIR, "wallet.json");

interface WalletData {
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

export function getOrCreateWallet() {
  // Ensure .yoda directory exists
  if (!existsSync(YODA_DIR)) {
    mkdirSync(YODA_DIR, { recursive: true });
  }

  // Load existing wallet
  if (existsSync(WALLET_PATH)) {
    const data = JSON.parse(readFileSync(WALLET_PATH, "utf-8")) as WalletData;
    return privateKeyToAccount(data.privateKey);
  }

  // Generate new wallet
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const walletData: WalletData = {
    privateKey,
    address: account.address,
  };

  writeFileSync(WALLET_PATH, JSON.stringify(walletData, null, 2));

  console.log("");
  console.log("=".repeat(60));
  console.log("  YODA.FUN AGENT WALLET CREATED");
  console.log("=".repeat(60));
  console.log("");
  console.log(`  Address: ${account.address}`);
  console.log("");
  console.log("  Fund this wallet with USDC on Base to start betting.");
  console.log("  Minimum recommended: $5 USDC");
  console.log("");
  console.log(`  Wallet saved to: ${WALLET_PATH}`);
  console.log("=".repeat(60));
  console.log("");

  return account;
}

export function getWalletAddress(): `0x${string}` | null {
  if (!existsSync(WALLET_PATH)) {
    return null;
  }
  const data = JSON.parse(readFileSync(WALLET_PATH, "utf-8")) as WalletData;
  return data.address;
}
