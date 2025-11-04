import type { Database, Transaction as DbTransaction } from "@yoda.fun/db";
import { transaction, userBalance } from "@yoda.fun/db";
import type { UserId } from "@yoda.fun/shared/typeid";
import { eq, sql } from "drizzle-orm";

/**
 * Get or create user balance record
 */
export async function getOrCreateUserBalance(
  db: Database | DbTransaction,
  userId: UserId
) {
  const existing = await db
    .select()
    .from(userBalance)
    .where(eq(userBalance.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new balance record
  const newBalance = await db
    .insert(userBalance)
    .values({
      userId,
      availableBalance: "0.00",
      pendingBalance: "0.00",
      totalDeposited: "0.00",
      totalWithdrawn: "0.00",
    })
    .returning();

  return newBalance[0];
}

/**
 * Add funds to available balance (for deposits)
 */
export async function addToAvailableBalance(
  db: Database | DbTransaction,
  userId: UserId,
  amount: string
) {
  await db
    .update(userBalance)
    .set({
      availableBalance: sql`${userBalance.availableBalance} + ${amount}`,
      totalDeposited: sql`${userBalance.totalDeposited} + ${amount}`,
    })
    .where(eq(userBalance.userId, userId));
}

/**
 * Move funds from available to pending (when placing bet)
 */
export async function lockFundsForBet(
  db: Database | DbTransaction,
  userId: UserId,
  amount: string
) {
  // Check if user has sufficient balance
  const balance = await getOrCreateUserBalance(db, userId);
  const available = Number.parseFloat(balance.availableBalance);
  const required = Number.parseFloat(amount);

  if (available < required) {
    throw new Error("Insufficient balance");
  }

  await db
    .update(userBalance)
    .set({
      availableBalance: sql`${userBalance.availableBalance} - ${amount}`,
      pendingBalance: sql`${userBalance.pendingBalance} + ${amount}`,
    })
    .where(eq(userBalance.userId, userId));
}

/**
 * Deduct from available balance (for withdrawals)
 */
export async function deductFromAvailableBalance(
  db: Database | DbTransaction,
  userId: UserId,
  amount: string
) {
  const balance = await getOrCreateUserBalance(db, userId);
  const available = Number.parseFloat(balance.availableBalance);
  const required = Number.parseFloat(amount);

  if (available < required) {
    throw new Error("Insufficient balance for withdrawal");
  }

  await db
    .update(userBalance)
    .set({
      availableBalance: sql`${userBalance.availableBalance} - ${amount}`,
      totalWithdrawn: sql`${userBalance.totalWithdrawn} + ${amount}`,
    })
    .where(eq(userBalance.userId, userId));
}

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(
  db: Database | DbTransaction,
  userId: UserId,
  options?: {
    limit?: number;
    offset?: number;
    type?: string;
  }
) {
  const query = db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .orderBy(sql`${transaction.createdAt} DESC`);

  if (options?.limit) {
    query.limit(options.limit);
  }

  if (options?.offset) {
    query.offset(options.offset);
  }

  return await query;
}
