"use client";

import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { motion } from "motion/react";
import { useState } from "react";

export interface SwipeDirection {
  type: "left" | "right";
  velocity: number;
  offset: number;
}

export interface SwipeCardProps<T> {
  data: T;
  onSwipeLeft?: (data: T) => void;
  onSwipeRight?: (data: T) => void;
  onSwipe?: (data: T, direction: SwipeDirection) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const SWIPE_THRESHOLD = 150;
const VELOCITY_THRESHOLD = 500;

export function SwipeCard<T>({
  data,
  onSwipeLeft,
  onSwipeRight,
  onSwipe,
  children,
  className = "",
  style,
}: SwipeCardProps<T>) {
  const [exitX, setExitX] = useState(0);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: {
      offset: { x: number; y: number };
      velocity: { x: number; y: number };
    }
  ) => {
    const { offset, velocity } = info;
    const swipeDistance = Math.abs(offset.x);
    const swipeVelocity = Math.abs(velocity.x);

    // Determine if swipe was successful
    if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > VELOCITY_THRESHOLD) {
      const direction: SwipeDirection["type"] = offset.x > 0 ? "right" : "left";
      const swipeDirection: SwipeDirection = {
        type: direction,
        velocity: velocity.x,
        offset: offset.x,
      };

      // Set exit animation direction
      setExitX(
        direction === "right"
          ? NUMERIC_CONSTANTS.swipe.exitDistance
          : -NUMERIC_CONSTANTS.swipe.exitDistance
      );

      // Call appropriate callbacks
      if (direction === "right") {
        onSwipeRight?.(data);
      } else {
        onSwipeLeft?.(data);
      }
      onSwipe?.(data, swipeDirection);
    }
  };

  return (
    <motion.div
      animate={
        exitX !== 0
          ? {
              x: exitX,
              opacity: 0,
              scale: NUMERIC_CONSTANTS.swipe.exitScale,
              transition: {
                duration:
                  NUMERIC_CONSTANTS.swipe.animationDuration /
                  NUMERIC_CONSTANTS.swipe.millisecondsPerSecond,
              },
            }
          : { x: 0, opacity: 1, scale: 1 }
      }
      className={className}
      drag="x"
      dragElastic={NUMERIC_CONSTANTS.swipe.dragElasticity}
      initial={{ scale: 1, opacity: 1 }}
      onDragEnd={handleDragEnd}
      style={{
        ...style,
        touchAction: "pan-y",
        cursor: "grab",
      }}
      whileDrag={{
        scale: NUMERIC_CONSTANTS.swipe.scaleOnDrag,
        cursor: "grabbing",
      }}
    >
      <motion.div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        {children}

        {/* Swipe preview overlays */}
        <motion.div
          animate={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `rgba(34, 197, 94, ${NUMERIC_CONSTANTS.swipe.overlayOpacity})`,
            pointerEvents: "none",
            borderRadius: "inherit",
          }}
          whileTap={{ opacity: 0 }}
        />

        <motion.div
          animate={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `rgba(239, 68, 68, ${NUMERIC_CONSTANTS.swipe.overlayOpacity})`,
            pointerEvents: "none",
            borderRadius: "inherit",
          }}
          whileTap={{ opacity: 0 }}
        />
      </motion.div>
    </motion.div>
  );
}
