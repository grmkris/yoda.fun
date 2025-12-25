"use client";

import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import {
  type MotionValue,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
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

  // Track drag position for overlay opacity
  const x = useMotionValue(0);

  // Transform drag position to overlay opacities
  const yesOpacity = useTransform(x, [0, 100], [0, 0.5]);
  const noOpacity = useTransform(x, [-100, 0], [0.5, 0]);

  // Transform drag to rotation
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

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

    if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > VELOCITY_THRESHOLD) {
      const direction: SwipeDirection["type"] = offset.x > 0 ? "right" : "left";
      const swipeDirection: SwipeDirection = {
        type: direction,
        velocity: velocity.x,
        offset: offset.x,
      };

      setExitX(
        direction === "right"
          ? NUMERIC_CONSTANTS.swipe.exitDistance
          : -NUMERIC_CONSTANTS.swipe.exitDistance
      );

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
              rotate: exitX > 0 ? 20 : -20,
              transition: {
                duration:
                  NUMERIC_CONSTANTS.swipe.animationDuration /
                  NUMERIC_CONSTANTS.swipe.millisecondsPerSecond,
                ease: [0.32, 0.72, 0, 1],
              },
            }
          : { x: 0, opacity: 1, scale: 1, rotate: 0 }
      }
      className={className}
      drag="x"
      dragElastic={NUMERIC_CONSTANTS.swipe.dragElasticity}
      initial={{ scale: 1, opacity: 1 }}
      onDragEnd={handleDragEnd}
      style={{
        ...style,
        x,
        rotate,
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

        {/* YES overlay - Celestial Teal glow */}
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 175 / 40%), oklch(0.72 0.18 175 / 20%))",
            boxShadow: "inset 0 0 80px oklch(0.72 0.18 175 / 40%)",
            pointerEvents: "none",
            borderRadius: "inherit",
            opacity: yesOpacity as unknown as MotionValue<number>,
          }}
        />

        {/* NO overlay - Astral Coral glow */}
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(225deg, oklch(0.68 0.20 25 / 40%), oklch(0.68 0.20 25 / 20%))",
            boxShadow: "inset 0 0 80px oklch(0.68 0.20 25 / 40%)",
            pointerEvents: "none",
            borderRadius: "inherit",
            opacity: noOpacity as unknown as MotionValue<number>,
          }}
        />
      </motion.div>
    </motion.div>
  );
}
