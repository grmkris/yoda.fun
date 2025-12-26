"use client";

import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import {
  type ForwardedRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { SwipeCard, type SwipeDirection } from "./swipe-card";

export interface SwipeStackProps<T> {
  cards: T[];
  onSwipeLeft?: (data: T) => void;
  onSwipeRight?: (data: T) => void;
  onSwipe?: (data: T, direction: SwipeDirection) => void;
  renderCard: (data: T, index: number) => React.ReactNode;
  maxVisibleCards?: number;
  className?: string;
  disabled?: boolean;
}

export interface SwipeStackRef {
  swipeLeft: () => void;
  swipeRight: () => void;
  getCurrentCard: () => unknown | undefined;
  revert: () => void;
}

const DEFAULT_MAX_VISIBLE_CARDS = 3;

interface CardStyleParams {
  isTopCard: boolean;
  isRemoved: boolean;
  yOffset: number;
  scale: number;
  opacity: number;
  zIndex: number;
  stackIndex: number;
}

function getCardStyles({
  isTopCard,
  isRemoved,
  yOffset,
  scale,
  opacity,
  zIndex,
  stackIndex,
}: CardStyleParams): React.CSSProperties {
  return {
    position: isTopCard ? "relative" : "absolute",
    top: isTopCard ? 0 : yOffset,
    left: 0,
    right: 0,
    zIndex,
    transform: `scale(${scale})`,
    opacity: isRemoved ? 0 : opacity,
    transformOrigin: "top center",
    transition: isTopCard
      ? "none"
      : `transform ${NUMERIC_CONSTANTS.swipe.transitionDuration}s ease, opacity ${NUMERIC_CONSTANTS.swipe.transitionDuration}s ease`,
    pointerEvents: isTopCard ? "auto" : "none",
    filter: isTopCard ? "none" : `brightness(${1 - stackIndex * 0.08})`,
  };
}

function SwipeStackComponent<T>(
  {
    cards,
    onSwipeLeft,
    onSwipeRight,
    onSwipe,
    renderCard,
    maxVisibleCards = DEFAULT_MAX_VISIBLE_CARDS,
    className = "",
    disabled = false,
  }: SwipeStackProps<T>,
  ref: ForwardedRef<SwipeStackRef>
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [removedCards, setRemovedCards] = useState<Set<number>>(new Set());

  const visibleCards = cards
    .slice(currentIndex, currentIndex + maxVisibleCards)
    .map((card, idx) => ({
      card,
      index: currentIndex + idx,
    }));

  const handleSwipe = (
    index: number,
    handler?: (item: T) => void,
    cardData?: T
  ) => {
    if (cardData) {
      handler?.(cardData);
    }

    setRemovedCards((prev) => new Set(prev).add(index));

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setRemovedCards((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, NUMERIC_CONSTANTS.swipe.animationDuration);
  };

  useImperativeHandle(ref, () => ({
    swipeLeft: () => {
      const current = visibleCards[0];
      if (current) {
        handleSwipe(current.index, onSwipeLeft, current.card);
      }
    },
    swipeRight: () => {
      const current = visibleCards[0];
      if (current) {
        handleSwipe(current.index, onSwipeRight, current.card);
      }
    },
    getCurrentCard: () => visibleCards[0]?.card,
    revert: () => {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      setRemovedCards(new Set());
    },
  }));

  if (currentIndex >= cards.length) {
    return (
      <div className={className}>
        <div
          className="font-heading"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: `${NUMERIC_CONSTANTS.swipe.emptyStateHeight}px`,
            color: "oklch(0.60 0.04 280)",
          }}
        >
          No more cards
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        {visibleCards
          .slice()
          .reverse()
          .map(({ card, index }, reverseIdx) => {
            const stackIndex = visibleCards.length - 1 - reverseIdx;
            const scale =
              1 - stackIndex * NUMERIC_CONSTANTS.swipe.stackScaleFactor;
            const opacity =
              1 - stackIndex * NUMERIC_CONSTANTS.swipe.stackOpacityFactor;
            const yOffset = stackIndex * NUMERIC_CONSTANTS.swipe.stackYOffset;
            const isTopCard = stackIndex === 0;
            const isRemoved = removedCards.has(index);

            const cosmicTint =
              stackIndex > 0
                ? `linear-gradient(180deg, oklch(0.65 0.25 290 / ${stackIndex * 3}%) 0%, transparent 100%)`
                : "none";

            const cardStyles = getCardStyles({
              isTopCard,
              isRemoved,
              yOffset,
              scale,
              opacity,
              zIndex: visibleCards.length - stackIndex,
              stackIndex,
            });

            return (
              <div key={index} style={cardStyles}>
                {isTopCard ? (
                  <SwipeCard
                    data={card}
                    disabled={disabled}
                    onSwipe={(data, direction) => onSwipe?.(data, direction)}
                    onSwipeLeft={(data) =>
                      handleSwipe(index, onSwipeLeft, data)
                    }
                    onSwipeRight={(data) =>
                      handleSwipe(index, onSwipeRight, data)
                    }
                  >
                    {renderCard(card, index)}
                  </SwipeCard>
                ) : (
                  <div style={{ position: "relative" }}>
                    {renderCard(card, index)}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: cosmicTint,
                        borderRadius: "inherit",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export const SwipeStack = forwardRef(SwipeStackComponent) as <T>(
  props: SwipeStackProps<T> & { ref?: ForwardedRef<SwipeStackRef> }
) => ReturnType<typeof SwipeStackComponent>;
