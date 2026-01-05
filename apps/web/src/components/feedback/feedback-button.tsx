"use client";

import type { MarketId } from "@yoda.fun/shared/typeid";
import { Star } from "lucide-react";
import { useState } from "react";
import { type FeedbackType, useCanGiveFeedback } from "@/hooks/use-feedback";
import { authClient } from "@/lib/auth-client";
import { Button } from "../ui/button";
import { FeedbackModal } from "./feedback-modal";

interface FeedbackButtonProps {
  marketId: MarketId;
  marketTitle: string;
  feedbackType: FeedbackType;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function FeedbackButton({
  marketId,
  marketTitle,
  feedbackType,
  variant = "outline",
  size = "sm",
}: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const { data: canGive, isLoading } = useCanGiveFeedback(
    marketId,
    feedbackType
  );

  // Don't show if not authenticated
  if (!session) {
    return null;
  }

  // Don't show if loading or can't give feedback
  if (isLoading || !canGive?.canGive) {
    return null;
  }

  const label =
    feedbackType === "RESOLUTION" ? "Rate Resolution" : "Rate Quality";

  return (
    <>
      <Button
        className="gap-1"
        onClick={() => setIsOpen(true)}
        size={size}
        variant={variant}
      >
        <Star className="h-4 w-4" />
        {label}
      </Button>

      <FeedbackModal
        feedbackType={feedbackType}
        marketId={marketId}
        marketTitle={marketTitle}
        onClose={() => setIsOpen(false)}
        open={isOpen}
      />
    </>
  );
}
