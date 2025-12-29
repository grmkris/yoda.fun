import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../api";
import { betRouter } from "./bet-router";
import { followRouter } from "./follow-router";
import { leaderboardRouter } from "./leaderboard-router";
import { marketRouter } from "./market-router";
import { pointsRouter } from "./points-router";
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
  points: pointsRouter,
  leaderboard: leaderboardRouter,
  profile: profileRouter,
  follow: followRouter,
  reward: rewardRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
