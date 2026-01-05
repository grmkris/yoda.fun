/**
 * Custom x402 Solana Client
 * Handles automatic payment for x402-protected endpoints via Solana
 * Based on x402-solana package, customized for our use case
 */

import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  type TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

// Constants
const DEFAULT_COMPUTE_UNIT_LIMIT = 7000;
const DEFAULT_COMPUTE_UNIT_PRICE_MICROLAMPORTS = 1;
const SOLANA_MAINNET_RPC =
  "https://mainnet.helius-rpc.com/?api-key=4511fb68-c61c-4a46-82fc-427850943ac8";

// Types
export interface WalletAdapter {
  publicKey?: { toString(): string };
  address?: string;
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}

interface PaymentRequirements {
  scheme: string;
  network: string;
  amount?: string;
  asset?: string;
  payTo?: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
}

interface X402Response {
  x402Version: number;
  error?: string;
  accepts: PaymentRequirements[];
  resource?: {
    url: string;
    description?: string;
    mimeType?: string;
  };
}

interface X402ClientConfig {
  wallet: WalletAdapter;
  rpcUrl?: string;
  maxPaymentAmount?: bigint;
  verbose?: boolean;
}

// Network matching - supports CAIP-2 format
function isSolanaNetwork(network: string): boolean {
  return network.startsWith("solana:") || network === "solana";
}

/**
 * Create payment payload for X-PAYMENT header
 */
function createPaymentPayload(
  transaction: VersionedTransaction,
  paymentRequirements: PaymentRequirements,
  resourceUrl: string
): string {
  const base64Transaction = Buffer.from(transaction.serialize()).toString(
    "base64"
  );

  const paymentPayload = {
    x402Version: 2,
    resource: {
      url: resourceUrl,
      description: (paymentRequirements.extra?.description as string) || "",
      mimeType:
        (paymentRequirements.extra?.mimeType as string) || "application/json",
    },
    accepted: paymentRequirements,
    payload: {
      transaction: base64Transaction,
    },
  };

  return Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
}

/**
 * Build and sign a Solana transaction for x402 payment
 */
async function createSolanaPaymentTransaction(
  wallet: WalletAdapter,
  paymentRequirements: PaymentRequirements,
  rpcUrl: string
): Promise<VersionedTransaction> {
  const connection = new Connection(rpcUrl, "confirmed");

  // Extract fee payer from payment requirements
  const feePayer = paymentRequirements.extra?.feePayer as string | undefined;
  if (!feePayer) {
    throw new Error(
      "Missing facilitator feePayer in payment requirements (extra.feePayer)"
    );
  }
  const feePayerPubkey = new PublicKey(feePayer);

  // Get wallet address
  const walletAddress = wallet?.publicKey?.toString() || wallet?.address;
  if (!walletAddress) {
    throw new Error("Missing connected Solana wallet address");
  }
  const userPubkey = new PublicKey(walletAddress);

  // Get destination
  if (!paymentRequirements.payTo) {
    throw new Error("Missing payTo in payment requirements");
  }
  const destination = new PublicKey(paymentRequirements.payTo);

  // Get token mint
  if (!paymentRequirements.asset) {
    throw new Error("Missing token mint for SPL transfer");
  }
  const mintPubkey = new PublicKey(paymentRequirements.asset);

  const instructions: TransactionInstruction[] = [];

  // ComputeBudget instructions required by facilitator
  instructions.push(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: DEFAULT_COMPUTE_UNIT_LIMIT,
    })
  );
  instructions.push(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: DEFAULT_COMPUTE_UNIT_PRICE_MICROLAMPORTS,
    })
  );

  // Determine token program
  const mintInfo = await connection.getAccountInfo(mintPubkey, "confirmed");
  const programId =
    mintInfo?.owner?.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58()
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

  // Fetch mint for decimals
  const mint = await getMint(connection, mintPubkey, undefined, programId);

  // Derive ATAs
  const sourceAta = await getAssociatedTokenAddress(
    mintPubkey,
    userPubkey,
    false,
    programId
  );
  const destinationAta = await getAssociatedTokenAddress(
    mintPubkey,
    destination,
    false,
    programId
  );

  // Verify source ATA exists
  const sourceAtaInfo = await connection.getAccountInfo(sourceAta, "confirmed");
  if (!sourceAtaInfo) {
    throw new Error(
      `User does not have an Associated Token Account for ${paymentRequirements.asset}`
    );
  }

  // Verify destination ATA exists
  const destAtaInfo = await connection.getAccountInfo(
    destinationAta,
    "confirmed"
  );
  if (!destAtaInfo) {
    throw new Error(
      `Destination does not have an Associated Token Account for ${paymentRequirements.asset}`
    );
  }

  // Get payment amount
  const amountStr = paymentRequirements.amount;
  if (!amountStr) {
    throw new Error("Missing amount in payment requirements");
  }
  const amount = BigInt(amountStr);

  // Add transfer instruction
  instructions.push(
    createTransferCheckedInstruction(
      sourceAta,
      mintPubkey,
      destinationAta,
      userPubkey,
      amount,
      mint.decimals,
      [],
      programId
    )
  );

  // Build transaction
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: feePayerPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);

  // Sign with user's wallet
  if (typeof wallet?.signTransaction !== "function") {
    throw new Error("Connected wallet does not support signTransaction");
  }

  return wallet.signTransaction(transaction);
}

/**
 * Create a fetch wrapper that automatically handles x402 payments
 */
export function createX402SolanaFetch(config: X402ClientConfig) {
  const {
    wallet,
    rpcUrl = SOLANA_MAINNET_RPC,
    maxPaymentAmount,
    verbose,
  } = config;

  const log = (...args: unknown[]) => {
    if (verbose) console.log("[x402-solana]", ...args);
  };

  return async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.url;
    log("Making initial request to:", url);

    // Make initial request
    const response = await fetch(input, init);
    log("Initial response status:", response.status);

    // If not 402, return as-is
    if (response.status !== 402) {
      return response;
    }

    log("Got 402, parsing payment requirements...");

    // Parse payment requirements from 402 response
    const rawResponse = (await response.json()) as X402Response;
    log("Payment requirements:", JSON.stringify(rawResponse, null, 2));

    const accepts = rawResponse.accepts || [];

    // Find Solana payment option
    const selectedRequirements = accepts.find(
      (req) => req.scheme === "exact" && isSolanaNetwork(req.network)
    );

    if (!selectedRequirements) {
      console.error(
        "No suitable Solana payment requirements found. Available networks:",
        accepts.map((req) => req.network)
      );
      throw new Error("No suitable Solana payment requirements found");
    }

    // Check amount against max if specified
    const paymentAmount = BigInt(selectedRequirements.amount || "0");
    if (
      maxPaymentAmount &&
      maxPaymentAmount > 0n &&
      paymentAmount > maxPaymentAmount
    ) {
      throw new Error("Payment amount exceeds maximum allowed");
    }

    log("Creating signed transaction...");

    // Create signed transaction
    const signedTransaction = await createSolanaPaymentTransaction(
      wallet,
      selectedRequirements,
      rpcUrl
    );
    log("Transaction signed successfully");

    // Create payment payload
    const paymentHeader = createPaymentPayload(
      signedTransaction,
      selectedRequirements,
      url
    );
    log("Payment header created, length:", paymentHeader.length);

    // Retry with payment header
    const newInit: RequestInit = {
      ...init,
      headers: {
        ...(init?.headers || {}),
        "PAYMENT-SIGNATURE": paymentHeader,
      },
    };

    log("Retrying request with PAYMENT-SIGNATURE header...");
    const retryResponse = await fetch(input, newInit);
    log("Retry response status:", retryResponse.status);

    return retryResponse;
  };
}
