import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import { typeIdGenerator, type UserId } from "@yoda.fun/shared/typeid";

// x402 payment prices for different tools
export const TOOL_PRICES: Record<string, number> = {
  place_bet: 0.01, // $0.01 service fee
  get_points: 0.001, // $0.001
  get_bet_history: 0.001, // $0.001
};

// Free tools that don't require x402 payment
export const FREE_TOOLS = new Set([
  "list_markets",
  "get_market",
  "get_leaderboard",
  "get_profile",
]);

export interface X402PaymentInfo {
  walletAddress: `0x${string}`;
  amount: number;
  txHash?: string;
}

/**
 * Extract payment info from x402 headers
 * The X-PAYMENT header contains the signed payment authorization
 * The X-PAYMENT-RESPONSE header contains the settlement result
 */
export function parseX402Headers(headers: Headers): X402PaymentInfo | null {
  const paymentResponse = headers.get("X-PAYMENT-RESPONSE");
  if (!paymentResponse) {
    return null;
  }

  try {
    // Parse the payment response (format depends on x402 implementation)
    const decoded = JSON.parse(atob(paymentResponse));
    return {
      walletAddress: decoded.payer as `0x${string}`,
      amount: decoded.amount,
      txHash: decoded.txHash,
    };
  } catch {
    return null;
  }
}

/**
 * Get or create a user for an agent wallet address
 * This enables wallet-based identity for AI agents
 */
// Base chain ID
const BASE_CHAIN_ID = 8453;

export async function getOrCreateAgentUser(
  db: Database,
  logger: Logger,
  walletAddress: `0x${string}`
): Promise<UserId> {
  // Check if wallet is already linked to a user
  const existing = await db
    .select()
    .from(DB_SCHEMA.walletAddress)
    .where(eq(DB_SCHEMA.walletAddress.address, walletAddress.toLowerCase()))
    .limit(1);

  if (existing[0]) {
    return existing[0].userId as UserId;
  }

  // Create new user for this agent wallet
  const userId = typeIdGenerator("user");

  await db.transaction(async (tx) => {
    // Create user
    await tx.insert(DB_SCHEMA.user).values({
      id: userId,
      name: `Agent ${walletAddress.slice(0, 8)}`,
      email: `${walletAddress.toLowerCase()}@agent.yoda.fun`,
    });

    // Link wallet
    await tx.insert(DB_SCHEMA.walletAddress).values({
      userId,
      address: walletAddress.toLowerCase(),
      chainId: BASE_CHAIN_ID.toString(),
      chainNamespace: "eip155",
      isPrimary: true,
    });

    // Create balance record with signup bonus (30 starting points)
    await tx.insert(DB_SCHEMA.userBalance).values({
      userId,
      points: 30,
      totalPointsPurchased: 0,
    });

    // Create transaction record
    await tx.insert(DB_SCHEMA.transaction).values({
      userId,
      type: "SIGNUP_BONUS",
      points: 30,
      status: "COMPLETED",
      metadata: { reason: "agent_signup_bonus" },
    });
  });

  logger.info(
    { userId, walletAddress },
    "Created agent user from x402 payment"
  );

  return userId;
}

/**
 * Verify x402 payment and get associated user
 * Returns userId if payment is valid, null otherwise
 */
export async function verifyX402AndGetUser(
  db: Database,
  logger: Logger,
  headers: Headers,
  toolName: string
): Promise<UserId | null> {
  // Free tools don't require payment
  if (FREE_TOOLS.has(toolName)) {
    return null; // Will need to handle differently
  }

  const paymentInfo = parseX402Headers(headers);
  if (!paymentInfo) {
    logger.warn({ toolName }, "Missing x402 payment for paid tool");
    return null;
  }

  const expectedPrice = TOOL_PRICES[toolName] ?? 0.01;
  if (paymentInfo.amount < expectedPrice) {
    logger.warn(
      { toolName, expected: expectedPrice, actual: paymentInfo.amount },
      "Insufficient x402 payment"
    );
    return null;
  }

  // Get or create user for this wallet
  const userId = await getOrCreateAgentUser(
    db,
    logger,
    paymentInfo.walletAddress
  );

  logger.info(
    {
      userId,
      walletAddress: paymentInfo.walletAddress,
      toolName,
      amount: paymentInfo.amount,
    },
    "x402 payment verified"
  );

  return userId;
}
