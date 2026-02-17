import { ORPCError } from "@orpc/server";
import type { SelectMarket } from "@yoda.fun/db/schema";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { BetId, UserId } from "@yoda.fun/shared/typeid";
import type { StorageClient } from "@yoda.fun/storage";
import { z } from "zod";
import { protectedProcedure } from "../api";

function withSignedImageUrl<T extends SelectMarket>(
  market: T,
  storage?: StorageClient
): T {
  if (!(storage && market.imageUrl)) {
    return market;
  }
  return {
    ...market,
    imageUrl: storage.getSignedUrl({ key: market.imageUrl, expiresIn: 3600 }),
  };
}

export const betRouter = {
  /**
   * Get user's bet history
   */
  history: protectedProcedure
    .input(
      z.object({
        status: z.enum(["ACTIVE", "WON", "LOST", "REFUNDED"]).optional(),
        limit: z
          .number()
          .min(NUMERIC_CONSTANTS.pagination.minLimit)
          .max(NUMERIC_CONSTANTS.pagination.maxLimit)
          .optional()
          .default(NUMERIC_CONSTANTS.pagination.defaultLimit),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      const bets = await context.betService.getBetHistory(userId, {
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        bets: bets.map(({ bet, market }) => ({
          bet,
          market: withSignedImageUrl(market, context.storage),
        })),
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get a single bet by ID
   */
  byId: protectedProcedure
    .input(z.object({ betId: BetId }))
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);
      const bet = await context.betService.getBetById(userId, input.betId);

      if (!bet) {
        throw new ORPCError("NOT_FOUND", { message: "Bet not found" });
      }

      return {
        bet: bet.bet,
        market: withSignedImageUrl(bet.market, context.storage),
      };
    }),
};
