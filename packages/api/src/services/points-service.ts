import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq, sql } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { UserId } from "@yoda.fun/shared/typeid";

// Points economy constants
export const STARTING_POINTS = 30;
export const DAILY_POINTS = 5;
export const VOTE_COST = 3;
export const SKIP_COST = 1;
export const FREE_SKIPS_PER_DAY = 3;

export const POINT_PACKS = [
  { tier: "starter", usdc: 5, points: 50 },
  { tier: "standard", usdc: 10, points: 120 },
  { tier: "pro", usdc: 20, points: 280 },
  { tier: "whale", usdc: 50, points: 800 },
] as const;

export type PointPackTier = (typeof POINT_PACKS)[number]["tier"];

export type TransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "BET_PLACED"
  | "PAYOUT"
  | "REFUND"
  | "REWARD"
  | "POINT_PURCHASE"
  | "DAILY_CLAIM"
  | "SKIP";

interface PointsServiceDeps {
  db: Database;
  logger: Logger;
}

export function createPointsService({ deps }: { deps: PointsServiceDeps }) {
  const { db, logger } = deps;

  return {
    /**
     * Get or create a user's points record with starting balance
     */
    async getOrCreatePoints(userId: UserId) {
      const existing = await db
        .select()
        .from(DB_SCHEMA.userBalance)
        .where(eq(DB_SCHEMA.userBalance.userId, userId))
        .limit(1);

      if (existing[0]) {
        return existing[0];
      }

      // New user gets starting points
      const created = await db
        .insert(DB_SCHEMA.userBalance)
        .values({
          userId,
          points: STARTING_POINTS,
          totalPointsPurchased: 0,
        })
        .returning();

      const record = created[0];
      if (!record) {
        throw new Error("Failed to create points record");
      }

      // Create transaction for starting points
      await db.insert(DB_SCHEMA.transaction).values({
        userId,
        type: "REWARD",
        points: STARTING_POINTS,
        status: "COMPLETED",
        metadata: { reason: "STARTING_BONUS" },
      });

      logger.info(
        { userId, points: STARTING_POINTS },
        "Created new points record with starting bonus"
      );
      return record;
    },

    /**
     * Get a user's current points
     */
    async getPoints(userId: UserId) {
      const balance = await this.getOrCreatePoints(userId);
      return {
        points: balance.points,
        totalPointsPurchased: balance.totalPointsPurchased,
      };
    },

    /**
     * Credit points to user's balance
     */
    async creditPoints(
      userId: UserId,
      amount: number,
      txType: TransactionType,
      metadata?: Record<string, unknown>
    ) {
      const result = await db.transaction(async (tx) => {
        // Ensure record exists
        const balanceRecords = await tx
          .select()
          .from(DB_SCHEMA.userBalance)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .limit(1);

        let balance = balanceRecords[0];
        if (!balance) {
          const created = await tx
            .insert(DB_SCHEMA.userBalance)
            .values({
              userId,
              points: STARTING_POINTS,
              totalPointsPurchased: 0,
            })
            .returning();
          balance = created[0];
          if (!balance) {
            throw new Error("Failed to create points record");
          }
        }

        // Update points
        const updateData: Record<string, unknown> = {
          points: sql`${DB_SCHEMA.userBalance.points} + ${amount}`,
        };

        if (txType === "POINT_PURCHASE") {
          updateData.totalPointsPurchased = sql`${DB_SCHEMA.userBalance.totalPointsPurchased} + ${amount}`;
        }

        const updated = await tx
          .update(DB_SCHEMA.userBalance)
          .set(updateData)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .returning();

        // Create transaction record
        const txRecord = await tx
          .insert(DB_SCHEMA.transaction)
          .values({
            userId,
            type: txType,
            points: amount,
            status: "COMPLETED",
            metadata,
          })
          .returning();

        return { balance: updated[0], transaction: txRecord[0] };
      });

      logger.info(
        { userId, amount, txType, transactionId: result.transaction?.id },
        "Credited points"
      );

      return result;
    },

    /**
     * Debit points from user's balance
     */
    async debitPoints(
      userId: UserId,
      amount: number,
      txType: TransactionType,
      metadata?: Record<string, unknown>
    ) {
      const result = await db.transaction(async (tx) => {
        // Get current points
        const balanceRecords = await tx
          .select()
          .from(DB_SCHEMA.userBalance)
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .limit(1);

        const balance = balanceRecords[0];
        if (!balance) {
          throw new Error("Points record not found");
        }

        if (balance.points < amount) {
          throw new Error(`Insufficient points: ${balance.points} < ${amount}`);
        }

        // Update points
        const updated = await tx
          .update(DB_SCHEMA.userBalance)
          .set({
            points: sql`${DB_SCHEMA.userBalance.points} - ${amount}`,
          })
          .where(eq(DB_SCHEMA.userBalance.userId, userId))
          .returning();

        // Create transaction record (negative for debit)
        const txRecord = await tx
          .insert(DB_SCHEMA.transaction)
          .values({
            userId,
            type: txType,
            points: -amount,
            status: "COMPLETED",
            metadata,
          })
          .returning();

        return { balance: updated[0], transaction: txRecord[0] };
      });

      logger.info(
        { userId, amount, txType, transactionId: result.transaction?.id },
        "Debited points"
      );

      return result;
    },

    /**
     * Purchase points with USDC
     */
    async purchasePoints(userId: UserId, tier: PointPackTier, txHash?: string) {
      const pack = POINT_PACKS.find((p) => p.tier === tier);
      if (!pack) {
        throw new Error(`Invalid pack tier: ${tier}`);
      }

      const result = await this.creditPoints(
        userId,
        pack.points,
        "POINT_PURCHASE",
        {
          packTier: tier,
          usdcAmount: pack.usdc.toString(),
          txHash,
        }
      );

      logger.info(
        { userId, tier, points: pack.points, usdc: pack.usdc },
        "Points purchased"
      );

      return {
        points: pack.points,
        usdc: pack.usdc,
        newBalance: result.balance?.points ?? 0,
      };
    },
  };
}

export type PointsService = ReturnType<typeof createPointsService>;
