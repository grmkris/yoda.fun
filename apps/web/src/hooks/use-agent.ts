"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function useAgentProfile() {
  return useQuery(orpc.agent.profile.queryOptions({}));
}

export function useRecentFeedback(options?: { limit?: number }) {
  return useQuery(
    orpc.agent.recentFeedback.queryOptions({
      input: { limit: options?.limit ?? 20 },
    })
  );
}
