import { ORPCError } from "@orpc/server";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, eq } from "@yoda.fun/db/drizzle";
import type { SelectMarket } from "@yoda.fun/db/schema";
import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { BetId, MarketId, UserId } from "@yoda.fun/shared/typeid";
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
   * Place a vote on a market (YES/NO costs 3 points, SKIP costs 0-1)
   */
  place: protectedProcedure
    .input(
      z.object({
        marketId: MarketId,
        vote: z.enum(["YES", "NO", "SKIP"]),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);
      const result = await context.betService.placeBet(userId, input);

      return result.match(
        (bet) => {
          // Process rewards for YES/NO votes (not SKIPs)
          if (input.vote !== "SKIP" && bet) {
            const betId = BetId.parse(bet.id);
            Promise.all([
              context.rewardService.processFirstBetBonus(userId, betId),
              context.rewardService.processReferralBonus(userId),
            ]).catch((error) => {
              context.logger.error(
                { error, userId },
                "Failed to process bet rewards"
              );
            });
          }

          return {
            success: true,
            betId: bet?.id ?? null,
            marketId: input.marketId,
            vote: input.vote,
            message:
              input.vote === "SKIP"
                ? "Market skipped"
                : `Vote placed successfully! You voted ${input.vote}.`,
          };
        },
        (error) => {
          throw new ORPCError(
            error.type === "MARKET_NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
            { message: error.message }
          );
        }
      );
    }),

  /**
   * Get crowd stats for a market (shown after voting)
   */
  crowd: protectedProcedure
    .input(z.object({ marketId: MarketId }))
    .handler(async ({ context, input }) => {
      const crowd = await context.betService.getMarketCrowd(input.marketId);

      if (!crowd) {
        throw new ORPCError("NOT_FOUND", { message: "Market not found" });
      }

      return crowd;
    }),

  /**
   * Get user's vote history
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

  /**
   * Record an on-chain bet (DB record only, no point deduction)
   */
  recordOnChain: protectedProcedure
    .input(
      z.object({
        marketId: MarketId,
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        vote: z.enum(["YES", "NO"]),
        amount: z.number().int().positive(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      // Verify market exists and has on-chain ID
      const market = await context.db.query.market.findFirst({
        where: eq(DB_SCHEMA.market.id, input.marketId),
      });

      if (!market?.onChainMarketId) {
        throw new ORPCError("NOT_FOUND", {
          message: "Market not found or not on-chain",
        });
      }

      // Check for existing bet
      const existing = await context.db.query.bet.findFirst({
        where: and(
          eq(DB_SCHEMA.bet.userId, userId),
          eq(DB_SCHEMA.bet.marketId, input.marketId)
        ),
      });

      if (existing) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Already bet on this market",
        });
      }

      // Record the on-chain bet in DB (no points deduction)
      const [bet] = await context.db
        .insert(DB_SCHEMA.bet)
        .values({
          userId,
          marketId: input.marketId,
          vote: input.vote,
          pointsSpent: 0,
          status: "ACTIVE",
          onChainTxHash: input.txHash,
          onChainBetAmount: input.amount,
        })
        .returning();

      context.logger.info(
        { userId, marketId: input.marketId, txHash: input.txHash },
        "On-chain bet recorded"
      );

      return {
        success: true,
        betId: bet?.id ?? null,
        txHash: input.txHash,
      };
    }),
};
