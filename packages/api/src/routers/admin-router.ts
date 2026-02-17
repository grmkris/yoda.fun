import { ORPCError } from "@orpc/server";
import { MarketResult } from "@yoda.fun/fhevm/sdk/types";
import { z } from "zod";
import { publicProcedure } from "../api";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function assertAdmin(adminSecret: string) {
  if (!ADMIN_SECRET || adminSecret !== ADMIN_SECRET) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Invalid admin secret",
    });
  }
}

const RESULT_MAP: Record<string, number> = {
  YES: MarketResult.Yes,
  NO: MarketResult.No,
  INVALID: MarketResult.Invalid,
};

export const adminRouter = {
  createMarket: publicProcedure
    .input(
      z.object({
        adminSecret: z.string(),
        title: z.string().min(1).max(500),
        description: z.string().max(2000).optional(),
        category: z.string().max(100).optional(),
        votingDurationMinutes: z.number().int().positive(),
        resolutionDurationMinutes: z.number().int().positive(),
      })
    )
    .handler(async ({ context, input }) => {
      assertAdmin(input.adminSecret);
      const now = Math.floor(Date.now() / 1000);
      const votingEndsAt = BigInt(now + input.votingDurationMinutes * 60);
      const resolutionDeadline = BigInt(
        now +
          input.votingDurationMinutes * 60 +
          input.resolutionDurationMinutes * 60
      );

      // Build metadata URI as inline JSON (indexer parses it)
      const metadata = JSON.stringify({
        description: input.description ?? "",
        category: input.category ?? "",
      });

      const { marketId, txHash } = await context.fhevmClient.createMarket(
        input.title,
        metadata,
        votingEndsAt,
        resolutionDeadline
      );

      context.logger.info(
        { marketId: marketId.toString(), txHash },
        "Admin created market"
      );

      return {
        onChainMarketId: Number(marketId),
        txHash,
      };
    }),

  resolveMarket: publicProcedure
    .input(
      z.object({
        adminSecret: z.string(),
        onChainMarketId: z.number().int().nonnegative(),
        result: z.enum(["YES", "NO", "INVALID"]),
      })
    )
    .handler(async ({ context, input }) => {
      assertAdmin(input.adminSecret);
      const resultEnum = RESULT_MAP[input.result];
      if (resultEnum === undefined) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Unknown result: ${input.result}`,
        });
      }

      const marketId = BigInt(input.onChainMarketId);

      const result = await context.fhevmClient.resolveAndDecrypt(
        marketId,
        resultEnum
      );

      context.logger.info(
        {
          marketId: input.onChainMarketId,
          result: input.result,
          resolveTxHash: result.resolveTxHash,
          submitTotalsTxHash: result.submitTotalsTxHash,
        },
        "Admin resolved market"
      );

      return {
        resolveTxHash: result.resolveTxHash,
        submitTotalsTxHash: result.submitTotalsTxHash,
        decryptedYes: result.decryptedYes?.toString() ?? null,
        decryptedNo: result.decryptedNo?.toString() ?? null,
      };
    }),
};
