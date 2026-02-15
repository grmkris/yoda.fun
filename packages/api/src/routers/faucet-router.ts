import { ORPCError } from "@orpc/server";
import { DB_SCHEMA } from "@yoda.fun/db";
import { and, eq, gte } from "@yoda.fun/db/drizzle";
import { UserId } from "@yoda.fun/shared/typeid";
import { z } from "zod";
import { protectedProcedure } from "../api";

const FAUCET_AMOUNT = 1000n;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const faucetRouter = {
  mint: protectedProcedure
    .input(
      z.object({
        walletAddress: z
          .string()
          .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = UserId.parse(context.session.user.id);

      // Verify wallet belongs to user
      const wallet = await context.db.query.walletAddress.findFirst({
        where: and(
          eq(DB_SCHEMA.walletAddress.userId, userId),
          eq(DB_SCHEMA.walletAddress.address, input.walletAddress.toLowerCase())
        ),
      });

      if (!wallet) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Wallet not linked to your account",
        });
      }

      // Rate limit: 1 faucet claim per day per user
      const oneDayAgo = new Date(Date.now() - ONE_DAY_MS);
      const recentClaim = await context.db.query.transaction.findFirst({
        where: and(
          eq(DB_SCHEMA.transaction.userId, userId),
          eq(DB_SCHEMA.transaction.type, "FAUCET_CLAIM"),
          gte(DB_SCHEMA.transaction.createdAt, oneDayAgo)
        ),
      });

      if (recentClaim) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Faucet can only be used once per day",
        });
      }

      // Mint tokens on-chain
      const txHash = await context.fhevmClient.mintTokens(
        input.walletAddress as `0x${string}`,
        FAUCET_AMOUNT
      );

      // Record the faucet claim
      await context.db.insert(DB_SCHEMA.transaction).values({
        userId,
        type: "FAUCET_CLAIM",
        points: 0,
        status: "COMPLETED",
        metadata: {
          walletAddress: input.walletAddress,
          amount: FAUCET_AMOUNT.toString(),
          txHash,
        },
      });

      context.logger.info(
        { userId, walletAddress: input.walletAddress, txHash },
        "Faucet tokens minted"
      );

      return {
        success: true,
        txHash,
        amount: FAUCET_AMOUNT.toString(),
      };
    }),
};
