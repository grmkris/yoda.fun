"use client";

import { useRef, useState } from "react";
import type { SwipeStackRef } from "@/components/swipe/swipe-stack";
import { SwipeStack } from "@/components/swipe/swipe-stack";
import { useMarketStack, usePlaceBet } from "@/hooks";
import { BetConfirmationModal } from "./bet-confirmation-modal";
import { EmptyState } from "./empty-state";
import { GameCard, type MarketCard } from "./game-card";
import { Skeleton } from "@/components/ui/skeleton";

export function CardSwiperSection() {
  const swipeRef = useRef<SwipeStackRef>(null);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [pendingBet, setPendingBet] = useState<MarketCard | null>(null);

  const { data, isLoading, error, refetch } = useMarketStack(10);
  const placeBet = usePlaceBet();

  // Filter out already swiped markets
  const markets = (data?.markets ?? []).filter((m) => !swipedIds.has(m.id));

  const handleSwipeLeft = (card: MarketCard) => {
    // Card skipped (NO vote or skip)
    setSwipedIds((prev) => new Set(prev).add(card.id));
  };

  const handleSwipeRight = (card: MarketCard) => {
    // Card swiped right - show confirmation modal
    setPendingBet(card);
  };

  const handleConfirmBet = (vote: "YES" | "NO") => {
    if (!pendingBet) return;

    placeBet.mutate(
      { marketId: pendingBet.id, vote },
      {
        onSuccess: () => {
          setSwipedIds((prev) => new Set(prev).add(pendingBet.id));
          setPendingBet(null);
        },
        onError: () => {
          // Keep card in stack on error
          setPendingBet(null);
        },
      }
    );
  };

  const handleCancelBet = () => {
    setPendingBet(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="mb-4 font-medium">Predict & Win</h2>
        <div className="mx-auto max-w-md">
          <Skeleton className="h-[500px] w-full rounded-2xl" />
          <div className="mt-6 flex items-center justify-center gap-6">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-14 w-14 rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="mb-4 font-medium">Predict & Win</h2>
        <div className="mx-auto max-w-md text-center">
          <p className="mb-4 text-muted-foreground">Failed to load markets</p>
          <button
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            onClick={() => refetch()}
            type="button"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const allSwiped = markets.length === 0;

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-4 font-medium">Predict & Win</h2>
      <div className="mx-auto max-w-md">
        {allSwiped ? (
          <EmptyState />
        ) : (
          <>
            <SwipeStack
              cards={markets as MarketCard[]}
              className="min-h-[500px]"
              maxVisibleCards={3}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              ref={swipeRef}
              renderCard={(card) => <GameCard card={card as MarketCard} />}
            />

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-center gap-6">
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-2xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                disabled={placeBet.isPending}
                onClick={() => swipeRef.current?.swipeLeft()}
                type="button"
              >
                ✗
              </button>
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                disabled={placeBet.isPending}
                onClick={() => swipeRef.current?.swipeRight()}
                type="button"
              >
                ✓
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bet Confirmation Modal */}
      <BetConfirmationModal
        isLoading={placeBet.isPending}
        market={pendingBet}
        onCancel={handleCancelBet}
        onConfirm={handleConfirmBet}
      />
    </section>
  );
}
