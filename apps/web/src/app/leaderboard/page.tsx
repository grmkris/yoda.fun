import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverOrpc } from "@/utils/orpc.server";
import Leaderboard from "./leaderboard";

export const metadata = {
  title: "Leaderboard | yoda.fun",
  description:
    "See the top predictors on yoda.fun — who's calling the future right?",
};

export default async function LeaderboardPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery(
    serverOrpc.leaderboard.get.queryOptions({
      input: { period: "allTime", metric: "profit" },
    })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto px-4 py-4">
        <Leaderboard />
      </div>
    </HydrationBoundary>
  );
}
