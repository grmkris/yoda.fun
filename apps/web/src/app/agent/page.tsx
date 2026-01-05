import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { serverOrpc } from "@/utils/orpc.server";
import AgentProfile from "./agent-profile";

export const metadata: Metadata = {
  title: "Yoda Agent | Yoda.fun",
  description:
    "View Yoda's AI agent profile, reputation scores, and feedback history on the ERC-8004 protocol.",
};

export default async function AgentPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery(serverOrpc.agent.profile.queryOptions({}));

  await queryClient.prefetchQuery(
    serverOrpc.agent.recentFeedback.queryOptions({
      input: { limit: 10 },
    })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto px-4 py-8">
        <AgentProfile />
      </div>
    </HydrationBoundary>
  );
}
