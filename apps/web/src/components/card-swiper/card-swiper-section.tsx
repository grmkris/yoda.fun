"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useHaptic } from "@/hooks/use-haptic";
import { useMarketStack } from "@/hooks/use-market-stack";
import { usePlaceBet } from "@/hooks/use-place-bet";
import { CardDetailsSheet } from "./card-details-sheet";
import { CardFront, type MarketCard } from "./card-front";
import { CardStack, type CardStackRef } from "./card-stack";
import { EmptyState } from "./empty-state";
import type { SwipeDirection } from "./swipeable-card";

export function CardSwiperSection() {
  const [swipedCount, setSwipedCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [selectedCard, setSelectedCard] = useState<MarketCard | null>(null);
  const stackRef = useRef<CardStackRef>(null);
  const { vibrateOnError } = useHaptic();

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMarketStack(10);
  const placeBet = usePlaceBet();

  const allMarkets = useMemo(
    () => data?.pages.flatMap((page) => page.markets) ?? [],
    [data]
  );

  const remaining = allMarkets.length - swipedCount;

  useEffect(() => {
    if (remaining <= 3 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [remaining, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSwipe = (card: MarketCard, vote: "YES" | "NO" | "SKIP") => {
    setSwipedCount((prev) => prev + 1);
    setSelectedCard(null);

    placeBet.mutate(
      { marketId: card.id, vote },
      {
        onError: () => {
          setSwipedCount((prev) => prev - 1);
          stackRef.current?.revert();
          setIsBlocked(true);
          vibrateOnError();
        },
      }
    );
  };

  // Handler for swipe direction to vote mapping
  const handleDirectionSwipe = (
    card: MarketCard,
    direction: SwipeDirection
  ) => {
    const voteMap = { left: "NO", right: "YES", down: "SKIP" } as const;
    handleSwipe(card, voteMap[direction]);
  };

  // Sheet action handlers
  const handleSheetVoteYes = () => {
    if (selectedCard) {
      stackRef.current?.swipeRight();
    }
  };

  const handleSheetVoteNo = () => {
    if (selectedCard) {
      stackRef.current?.swipeLeft();
    }
  };

  const handleSheetSkip = () => {
    if (selectedCard) {
      stackRef.current?.swipeDown();
    }
  };

  if (isLoading) {
    return (
      <section className="p-4">
        <div className="mx-auto max-w-md">
          <Skeleton
            className="h-[500px] w-full rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.15 0.03 280), oklch(0.12 0.02 290))",
            }}
          />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="p-4">
        <div
          className="mx-auto max-w-md rounded-3xl p-8 text-center"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.15 0.03 280 / 60%), oklch(0.12 0.02 290 / 40%))",
            border: "1px solid oklch(0.68 0.20 25 / 20%)",
          }}
        >
          <p
            className="mb-4 font-heading"
            style={{ color: "oklch(0.70 0.04 280)" }}
          >
            Failed to load markets
          </p>
          <button
            className="rounded-xl px-6 py-2.5 font-heading font-medium transition-all duration-200 hover:scale-105"
            onClick={() => refetch()}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.25 290), oklch(0.55 0.22 300))",
              color: "oklch(0.98 0.01 280)",
              boxShadow: "0 0 20px oklch(0.65 0.25 290 / 30%)",
            }}
            type="button"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4">
      <div className="mx-auto max-w-md">
        {remaining <= 0 && !hasNextPage ? (
          <EmptyState />
        ) : (
          <>
            <CardStack
              cards={allMarkets}
              className="min-h-[500px]"
              disabled={isBlocked || !!selectedCard}
              maxVisibleCards={5}
              onCardTap={setSelectedCard}
              onSwipe={handleDirectionSwipe}
              ref={stackRef}
              renderCard={(card) => <CardFront card={card} />}
            />

            <CardDetailsSheet
              card={selectedCard}
              isOpen={!!selectedCard}
              onClose={() => setSelectedCard(null)}
              onSkip={handleSheetSkip}
              onVoteNo={handleSheetVoteNo}
              onVoteYes={handleSheetVoteYes}
            />
          </>
        )}
      </div>
    </section>
  );
}
