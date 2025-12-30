"use client";

import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { AnimatePresence, motion } from "motion/react";
import {
  type ForwardedRef,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  SwipeableCard,
  type SwipeableCardRef,
  type SwipeDirection,
} from "./swipeable-card";

export interface CardStackProps<T> {
  cards: T[];
  renderCard: (data: T, index: number) => React.ReactNode;
  onSwipe: (data: T, direction: SwipeDirection) => void;
  onCardTap?: (data: T) => void;
  maxVisibleCards?: number;
  disabled?: boolean;
  className?: string;
}

export interface CardStackRef {
  swipeLeft: () => void;
  swipeRight: () => void;
  swipeDown: () => void;
  getCurrentCard: () => unknown | undefined;
  revert: () => void;
}

const { swipe: config } = NUMERIC_CONSTANTS;
const DEFAULT_MAX_VISIBLE = 3;

// GPU-optimized stack card styles
function getStackStyles(
  stackIndex: number,
  isTop: boolean,
  _totalVisible: number
): React.CSSProperties {
  const scale = 1 - stackIndex * config.stackScaleFactor;
  const opacity = 1 - stackIndex * config.stackOpacityFactor;
  const yOffset = stackIndex * config.stackYOffset;

  return {
    position: isTop ? "relative" : "absolute",
    top: isTop ? 0 : yOffset,
    left: 0,
    right: 0,
    zIndex: 10 - stackIndex,
    transform: `scale(${scale}) translateZ(0)`,
    opacity,
    transformOrigin: "top center",
    willChange: isTop ? "transform, opacity" : "auto",
    pointerEvents: isTop ? "auto" : "none",
    filter: isTop ? "none" : `brightness(${1 - stackIndex * 0.08})`,
  };
}

function CardStackComponent<T>(
  {
    cards,
    renderCard,
    onSwipe,
    onCardTap,
    maxVisibleCards = DEFAULT_MAX_VISIBLE,
    disabled = false,
    className = "",
  }: CardStackProps<T>,
  ref: ForwardedRef<CardStackRef>
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const topCardRef = useRef<SwipeableCardRef>(null);

  const visibleCards = cards
    .slice(currentIndex, currentIndex + maxVisibleCards)
    .map((card, idx) => ({
      card,
      globalIndex: currentIndex + idx,
      stackIndex: idx,
    }));

  const handleSwipe = useCallback(
    (cardIndex: number, direction: SwipeDirection) => {
      const card = cards[cardIndex];
      if (card) {
        onSwipe(card, direction);
      }
    },
    [cards, onSwipe]
  );

  const handleSwipeComplete = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  useImperativeHandle(ref, () => ({
    swipeLeft: () => topCardRef.current?.swipe("left"),
    swipeRight: () => topCardRef.current?.swipe("right"),
    swipeDown: () => topCardRef.current?.swipe("down"),
    getCurrentCard: () => visibleCards[0]?.card,
    revert: () => {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
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
            minHeight: `${config.emptyStateHeight}px`,
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
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <AnimatePresence mode="popLayout">
          {/* Render bottom to top for proper z-index stacking */}
          {visibleCards
            .slice()
            .reverse()
            .map(({ card, globalIndex, stackIndex }) => {
              const isTop = stackIndex === 0;

              return (
                <motion.div
                  key={globalIndex}
                  layout={!isTop}
                  style={getStackStyles(stackIndex, isTop, visibleCards.length)}
                  transition={{
                    type: "spring",
                    ...config.spring.stack,
                  }}
                >
                  {isTop ? (
                    <SwipeableCard
                      disabled={disabled}
                      onSwipe={(dir) => handleSwipe(globalIndex, dir)}
                      onSwipeComplete={handleSwipeComplete}
                      onTap={() => onCardTap?.(card)}
                      ref={topCardRef}
                    >
                      {renderCard(card, globalIndex)}
                    </SwipeableCard>
                  ) : (
                    <>
                      {renderCard(card, globalIndex)}
                      {/* Cosmic tint for stacked cards */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: `linear-gradient(180deg, oklch(0.65 0.25 290 / ${stackIndex * 2}%) 0%, transparent 100%)`,
                          borderRadius: "inherit",
                          pointerEvents: "none",
                        }}
                      />
                    </>
                  )}
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export const CardStack = forwardRef(CardStackComponent) as <T>(
  props: CardStackProps<T> & { ref?: ForwardedRef<CardStackRef> }
) => ReturnType<typeof CardStackComponent>;
