"use client";

import { useRef, useState } from "react";
import { SwipeStack, type SwipeStackRef } from "@/components/swipe/swipe-stack";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketStack } from "@/hooks/use-market-stack";
import { usePlaceBet } from "@/hooks/use-place-bet";
import { EmptyState } from "./empty-state";
import { GameCard, type MarketCard } from "./game-card";

export function CardSwiperSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const stackRef = useRef<SwipeStackRef>(null);

  const { data, isLoading, error, refetch } = useMarketStack(20);
  const placeBet = usePlaceBet();

  const markets = data?.markets ?? [];

  const handleSwipe = (card: MarketCard, vote: "YES" | "NO") => {
    placeBet.mutate(
      { marketId: card.id, vote },
      {
        onSuccess: () => setCurrentIndex((i) => i + 1),
        onError: () => {
          stackRef.current?.revert();
          setIsBlocked(true);
        },
      }
    );
  };

  const handleSwipeLeft = (card: MarketCard) => handleSwipe(card, "NO");
  const handleSwipeRight = (card: MarketCard) => handleSwipe(card, "YES");

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

  const visibleMarkets = markets.slice(currentIndex);

  return (
    <section className="p-4">
      <div className="mx-auto max-w-md">
        {visibleMarkets.length === 0 ? (
          <EmptyState />
        ) : (
          <SwipeStack
            cards={visibleMarkets}
            className="min-h-[500px]"
            disabled={isBlocked}
            maxVisibleCards={5}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            ref={stackRef}
            renderCard={(card) => <GameCard card={card} />}
          />
        )}
      </div>
    </section>
  );
}
