import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../api";
import { adminRouter } from "./admin-router";
import { betRouter } from "./bet-router";
import { followRouter } from "./follow-router";
import { leaderboardRouter } from "./leaderboard-router";
import { marketRouter } from "./market-router";
import { profileRouter } from "./profile-router";
import { rewardRouter } from "./reward-router";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  market: marketRouter,
  bet: betRouter,
  leaderboard: leaderboardRouter,
  profile: profileRouter,
  follow: followRouter,
  reward: rewardRouter,
  admin: adminRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
