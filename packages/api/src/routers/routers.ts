import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../api";
import { balanceRouter } from "./balance-router";
import { betRouter } from "./bet-router";
import { marketRouter } from "./market-router";
import { withdrawalRouter } from "./withdrawal-router";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  market: marketRouter,
  bet: betRouter,
  balance: balanceRouter,
  withdrawal: withdrawalRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
