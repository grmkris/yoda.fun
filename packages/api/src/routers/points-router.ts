import { ORPCError } from "@orpc/server";
import { UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure } from "../api";
import { POINT_PACKS } from "../services/points-service";

export const pointsRouter = {
  /**
   * Get user's current points and daily status
   */
  get: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);

    const [points, dailyStatus] = await Promise.all([
      context.pointsService.getPoints(userId),
      context.dailyService.getDailyStatus(userId),
    ]);

    return {
      points: points.points,
      totalPointsPurchased: points.totalPointsPurchased,
      dailyPointsClaimed: dailyStatus.dailyPointsClaimed,
      freeSkipsRemaining: dailyStatus.freeSkipsRemaining,
      canClaimDaily: dailyStatus.canClaimDaily,
    };
  }),

  /**
   * Claim daily points (5 points, tap to claim)
   */
  claimDaily: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);

    try {
      const result = await context.dailyService.claimDailyPoints(userId);
      return {
        success: true,
        pointsClaimed: result.points,
        newBalance: result.newBalance,
      };
    } catch (error) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to claim daily points",
      });
    }
  }),

  /**
   * Get available point packs for purchase
   */
  packs: protectedProcedure.handler(() => {
    return {
      packs: POINT_PACKS.map((pack) => ({
        tier: pack.tier,
        usdc: pack.usdc,
        points: pack.points,
        bonusPercent:
          pack.tier === "starter"
            ? 0
            : Math.round(
                ((pack.points - pack.usdc * 10) / (pack.usdc * 10)) * 100
              ),
      })),
    };
  }),

  /**
   * Purchase points with USDC
   */
  purchase: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["starter", "standard", "pro", "whale"]),
        txHash: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      try {
        const result = await context.pointsService.purchasePoints(
          userId,
          input.tier,
          input.txHash
        );

        return {
          success: true,
          pointsPurchased: result.points,
          usdcSpent: result.usdc,
          newBalance: result.newBalance,
        };
      } catch (error) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            error instanceof Error
              ? error.message
              : "Failed to purchase points",
        });
      }
    }),

  /**
   * Get daily status (for UI indicators)
   */
  dailyStatus: protectedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id);
    const status = await context.dailyService.getDailyStatus(userId);

    return status;
  }),
};
