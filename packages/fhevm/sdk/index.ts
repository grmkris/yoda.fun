// --- Admin (server-side, viem) ---
export {
  createFhevmClient,
  type FhevmClient,
  type FhevmClientConfig,
} from "./server-client";

// --- Client (browser + Node.js, relayer SDK) ---
export { createFhevmInstance, type FhevmInstance } from "./client";
export { encryptBet, encryptAmount } from "./encrypt";
export { decryptBalance, decryptVote, type DecryptInstance } from "./decrypt";
export { walletClientToSigner } from "./adapter";

// --- Shared ---
export { FHEVM_CONFIG, type FhevmNetwork } from "./config";
export { type MarketView, MarketStatus, MarketResult } from "./types";
export {
  mishaTokenAbi,
  confidentialMishaAbi,
  mishaMarketAbi,
} from "./abis";
