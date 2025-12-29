import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, eq } from "@yoda.fun/db/drizzle";
import type { Logger } from "@yoda.fun/logger";
import type { UserId } from "@yoda.fun/shared/typeid";
import {
  DAILY_POINTS,
  FREE_SKIPS_PER_DAY,
  type PointsService,
  SKIP_COST,
} from "./points-service";

interface DailyServiceDeps {
  db: Database;
  logger: Logger;
  pointsService: PointsService;
}

/**
 * Get today's date in UTC as YYYY-MM-DD string
 */
function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0] as string;
}

export function createDailyService({ deps }: { deps: DailyServiceDeps }) {
  const { db, logger, pointsService } = deps;

  return {
    /**
     * Get or create today's daily state for a user
     */
    async getOrCreateDailyState(userId: UserId) {
      const today = getTodayUTC();

      const existing = await db
        .select()
        .from(DB_SCHEMA.dailyState)
        .where(
          and(
            eq(DB_SCHEMA.dailyState.userId, userId),
            eq(DB_SCHEMA.dailyState.date, today)
          )
        )
        .limit(1);

      if (existing[0]) {
        return existing[0];
      }

      const created = await db
        .insert(DB_SCHEMA.dailyState)
        .values({
          userId,
          date: today,
          freeSkipsUsed: 0,
          dailyPointsClaimed: false,
        })
        .returning();

      const record = created[0];
      if (!record) {
        throw new Error("Failed to create daily state");
      }

      logger.debug({ userId, date: today }, "Created daily state");
      return record;
    },

    /**
     * Get user's daily status
     */
    async getDailyStatus(userId: UserId) {
      const state = await this.getOrCreateDailyState(userId);
      const freeSkipsRemaining = Math.max(
        0,
        FREE_SKIPS_PER_DAY - state.freeSkipsUsed
      );

      return {
        date: state.date,
        dailyPointsClaimed: state.dailyPointsClaimed,
        freeSkipsUsed: state.freeSkipsUsed,
        freeSkipsRemaining,
        canClaimDaily: !state.dailyPointsClaimed,
      };
    },

    /**
     * Claim daily points (5 points, tap to claim)
     */
    async claimDailyPoints(userId: UserId) {
      const state = await this.getOrCreateDailyState(userId);

      if (state.dailyPointsClaimed) {
        throw new Error("Daily points already claimed today");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(DB_SCHEMA.dailyState)
          .set({ dailyPointsClaimed: true })
          .where(eq(DB_SCHEMA.dailyState.id, state.id));
      });

      const result = await pointsService.creditPoints(
        userId,
        DAILY_POINTS,
        "DAILY_CLAIM",
        { date: state.date }
      );

      logger.info(
        { userId, points: DAILY_POINTS, date: state.date },
        "Daily points claimed"
      );

      return {
        points: DAILY_POINTS,
        newBalance: result.balance?.points ?? 0,
      };
    },

    /**
     * Get skip cost for this user (0 if free skips remaining, 1 otherwise)
     */
    async getSkipCost(userId: UserId): Promise<number> {
      const state = await this.getOrCreateDailyState(userId);
      return state.freeSkipsUsed < FREE_SKIPS_PER_DAY ? 0 : SKIP_COST;
    },

    /**
     * Use a skip (increments counter, returns cost)
     */
    async useSkip(
      userId: UserId
    ): Promise<{ cost: number; freeSkipsRemaining: number }> {
      const state = await this.getOrCreateDailyState(userId);
      const cost = state.freeSkipsUsed < FREE_SKIPS_PER_DAY ? 0 : SKIP_COST;

      await db
        .update(DB_SCHEMA.dailyState)
        .set({ freeSkipsUsed: state.freeSkipsUsed + 1 })
        .where(eq(DB_SCHEMA.dailyState.id, state.id));

      if (cost > 0) {
        await pointsService.debitPoints(userId, cost, "SKIP", {
          date: state.date,
        });
      }

      const freeSkipsRemaining = Math.max(
        0,
        FREE_SKIPS_PER_DAY - state.freeSkipsUsed - 1
      );

      logger.debug({ userId, cost, freeSkipsRemaining }, "Skip used");

      return { cost, freeSkipsRemaining };
    },
  };
}

export type DailyService = ReturnType<typeof createDailyService>;
