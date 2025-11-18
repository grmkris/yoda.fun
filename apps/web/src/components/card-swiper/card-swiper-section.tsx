"use client";

import { useRef, useState } from "react";
import type { SwipeStackRef } from "@/components/swipe/swipe-stack";
import { SwipeStack } from "@/components/swipe/swipe-stack";
import { mockGameCards } from "@/data/mock-cards";
import { EmptyState } from "./empty-state";
import { GameCard } from "./game-card";

export function CardSwiperSection() {
  const swipeRef = useRef<SwipeStackRef>(null);
  const [swipedCount, setSwipedCount] = useState(0);

  const handleSwipeLeft = () => {
    // Card skipped - can add analytics here
    setSwipedCount((prev) => prev + 1);
  };

  const handleSwipeRight = () => {
    // Card liked - can add analytics here
    setSwipedCount((prev) => prev + 1);
  };

  const allSwiped = swipedCount >= mockGameCards.length;

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-4 font-medium">Discover Games</h2>
      <div className="mx-auto max-w-md">
        {allSwiped ? (
          <EmptyState />
        ) : (
          <>
            <SwipeStack
              cards={mockGameCards}
              className="min-h-[500px]"
              maxVisibleCards={3}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              ref={swipeRef}
              renderCard={(card) => <GameCard card={card} />}
            />

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-center gap-6">
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-2xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                onClick={() => swipeRef.current?.swipeLeft()}
                type="button"
              >
                ✗
              </button>
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                onClick={() => swipeRef.current?.swipeRight()}
                type="button"
              >
                ✓
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
