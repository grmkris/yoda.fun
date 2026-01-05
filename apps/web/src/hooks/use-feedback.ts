"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";

export type FeedbackType = "RESOLUTION" | "QUALITY";

export function useCanGiveFeedback(
  marketId: MarketId,
  feedbackType: FeedbackType
) {
  return useQuery(
    orpc.agent.canGiveFeedback.queryOptions({
      input: { marketId, feedbackType },
    })
  );
}

export function useMyMarketFeedback(marketId: MarketId) {
  return useQuery(
    orpc.agent.myFeedback.queryOptions({
      input: { marketId },
    })
  );
}

export function useGetFeedbackAuth() {
  return useMutation({
    mutationFn: async (input: {
      marketId: MarketId;
      feedbackType: FeedbackType;
    }) => client.agent.getFeedbackAuth(input),
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to get feedback authorization";
      toast.error(message);
    },
  });
}

export function useRecordFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      marketId: MarketId;
      feedbackType: FeedbackType;
      score: number;
      txHash: string;
      onChainIndex?: number;
    }) => client.agent.recordFeedback(input),
    onSuccess: () => {
      toast.success("Feedback submitted successfully!");
      // Invalidate agent profile to refresh reputation scores
      queryClient.invalidateQueries({
        queryKey: orpc.agent.profile.queryOptions({}).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: orpc.agent.recentFeedback.queryOptions({
          input: { limit: 20 },
        }).queryKey,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to record feedback";
      toast.error(message);
    },
  });
}
