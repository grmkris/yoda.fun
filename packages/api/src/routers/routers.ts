import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../api";
import { balanceRouter } from "./balance";
import { betRouter } from "./bet";
import { depositRouter } from "./deposit";
import { marketRouter } from "./market";
import { withdrawalRouter } from "./withdrawal";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  balance: balanceRouter,
  deposit: depositRouter,
  withdrawal: withdrawalRouter,
  market: marketRouter,
  bet: betRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
