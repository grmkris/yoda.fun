"use client";

import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import {
  motion,
  type PanInfo,
  useAnimation,
  useMotionValue,
  useTransform,
} from "motion/react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useHaptic } from "@/hooks/use-haptic";

export type SwipeDirection = "left" | "right" | "down";

export interface SwipeableCardRef {
  swipe: (direction: SwipeDirection) => void;
}

export interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipe: (direction: SwipeDirection) => void;
  onSwipeComplete: (direction: SwipeDirection) => void;
  onTap?: () => void;
  disabled?: boolean;
  className?: string;
}

const { swipe: config } = NUMERIC_CONSTANTS;

// GPU-optimized styles
const GPU_STYLES: React.CSSProperties = {
  willChange: "transform, opacity",
  transform: "translateZ(0)",
  backfaceVisibility: "hidden",
};

const OVERLAY_BASE_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: "none",
  borderRadius: "inherit",
};

function getSpringConfig(velocity: number) {
  const velocityFactor = Math.min(Math.abs(velocity) / 1000, 2);
  return {
    type: "spring" as const,
    stiffness: config.spring.exit.stiffness + velocityFactor * 200,
    damping: config.spring.exit.damping,
    velocity: velocity / 100,
  };
}

function getExitPosition(direction: SwipeDirection, exitDistance: number) {
  const positions = {
    right: { x: exitDistance, y: 0, rotate: 20 },
    left: { x: -exitDistance, y: 0, rotate: -20 },
    down: { x: 0, y: exitDistance, rotate: 0 },
  };
  return positions[direction];
}

export const SwipeableCard = forwardRef<SwipeableCardRef, SwipeableCardProps>(
  function SwipeableCard(
    {
      children,
      onSwipe,
      onSwipeComplete,
      onTap,
      disabled = false,
      className = "",
    },
    ref
  ) {
    const controls = useAnimation();
    const [isExiting, setIsExiting] = useState(false);
    const hasTriggeredThreshold = useRef({
      left: false,
      right: false,
      down: false,
    });
    const dragOffset = useRef({ x: 0, y: 0 });
    const { vibrateOnThreshold, vibrateOnSwipe } = useHaptic();

    // Motion values for reactive transforms
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Reactive overlays
    const yesOpacity = useTransform(
      x,
      [0, config.horizontalThreshold],
      [0, 0.5]
    );
    const noOpacity = useTransform(
      x,
      [-config.horizontalThreshold, 0],
      [0.5, 0]
    );
    const skipOpacity = useTransform(
      y,
      [0, config.downSwipeThreshold],
      [0, 0.5]
    );
    const rotate = useTransform(x, [-200, 200], [-15, 15]);

    // Haptic feedback when crossing thresholds
    const checkThresholds = useCallback(
      (offsetX: number, offsetY: number) => {
        if (
          offsetX > config.horizontalThreshold &&
          !hasTriggeredThreshold.current.right
        ) {
          hasTriggeredThreshold.current.right = true;
          vibrateOnThreshold();
        } else if (
          offsetX < -config.horizontalThreshold &&
          !hasTriggeredThreshold.current.left
        ) {
          hasTriggeredThreshold.current.left = true;
          vibrateOnThreshold();
        } else if (
          offsetY > config.downSwipeThreshold &&
          !hasTriggeredThreshold.current.down
        ) {
          hasTriggeredThreshold.current.down = true;
          vibrateOnThreshold();
        }

        // Reset if back within threshold
        if (Math.abs(offsetX) < config.horizontalThreshold * 0.8) {
          hasTriggeredThreshold.current.left = false;
          hasTriggeredThreshold.current.right = false;
        }
        if (offsetY < config.downSwipeThreshold * 0.8) {
          hasTriggeredThreshold.current.down = false;
        }
      },
      [vibrateOnThreshold]
    );

    const executeSwipe = useCallback(
      async (
        direction: SwipeDirection,
        velocity: { x: number; y: number },
        isProgrammatic = false
      ) => {
        if (isExiting) {
          return;
        }

        setIsExiting(true);
        onSwipe(direction);
        vibrateOnSwipe();

        const exit = getExitPosition(direction, config.exitDistance);
        const exitVelocity = direction === "down" ? velocity.y : velocity.x;

        // Smoother tween for button clicks, spring for natural swipes
        const transition = isProgrammatic
          ? {
              type: "tween" as const,
              duration: 0.35,
              ease: "easeInOut" as const,
            }
          : getSpringConfig(exitVelocity);

        await controls.start({
          x: exit.x,
          y: exit.y,
          opacity: 0,
          scale: config.exitScale,
          rotate: exit.rotate,
          transition,
        });

        onSwipeComplete(direction);
      },
      [controls, isExiting, onSwipe, onSwipeComplete, vibrateOnSwipe]
    );

    const handleDrag = useCallback(
      (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        dragOffset.current = { x: info.offset.x, y: info.offset.y };
        checkThresholds(info.offset.x, info.offset.y);
      },
      [checkThresholds]
    );

    const handleDragEnd = useCallback(
      (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { offset, velocity } = info;

        // Check down swipe first (priority)
        if (
          offset.y > config.downSwipeThreshold ||
          velocity.y > config.downVelocityThreshold
        ) {
          executeSwipe("down", velocity);
          return;
        }

        // Check horizontal swipes
        if (
          Math.abs(offset.x) > config.horizontalThreshold ||
          Math.abs(velocity.x) > config.velocityThreshold
        ) {
          executeSwipe(offset.x > 0 ? "right" : "left", velocity);
          return;
        }

        // Snap back with spring
        controls.start({
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          transition: {
            type: "spring",
            ...config.spring.snapBack,
          },
        });

        // Reset threshold triggers and drag offset
        hasTriggeredThreshold.current = {
          left: false,
          right: false,
          down: false,
        };
        dragOffset.current = { x: 0, y: 0 };
      },
      [controls, executeSwipe]
    );

    // Imperative handle for programmatic swipes (buttons)
    // Must depend on executeSwipe to avoid stale closure with isExiting
    useImperativeHandle(
      ref,
      () => ({
        swipe: (direction: SwipeDirection) => {
          executeSwipe(
            direction,
            { x: config.velocityThreshold, y: config.downVelocityThreshold },
            true // isProgrammatic - use smooth tween animation
          );
        },
      }),
      [executeSwipe]
    );

    // Tap handler with dead zone - prevent tap after drag
    const handleTap = useCallback(() => {
      if (disabled) {
        return;
      }
      const { x: dx, y: dy } = dragOffset.current;
      const moved = Math.abs(dx) > 5 || Math.abs(dy) > 5;
      if (!moved) {
        onTap?.();
      }
      dragOffset.current = { x: 0, y: 0 };
    }, [disabled, onTap]);

    return (
      <motion.div
        animate={controls}
        className={className}
        drag={!(disabled || isExiting)}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={config.dragElasticity}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        style={{
          ...GPU_STYLES,
          x,
          y,
          rotate,
          touchAction: "none",
          cursor: disabled ? "not-allowed" : "grab",
        }}
        whileDrag={{ scale: config.scaleOnDrag, cursor: "grabbing" }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {children}

          {/* YES overlay */}
          <motion.div
            style={{
              ...OVERLAY_BASE_STYLE,
              background:
                "linear-gradient(135deg, oklch(0.72 0.18 175 / 40%), oklch(0.72 0.18 175 / 20%))",
              boxShadow: "inset 0 0 80px oklch(0.72 0.18 175 / 40%)",
              opacity: yesOpacity,
            }}
          />

          {/* NO overlay */}
          <motion.div
            style={{
              ...OVERLAY_BASE_STYLE,
              background:
                "linear-gradient(225deg, oklch(0.68 0.20 25 / 40%), oklch(0.68 0.20 25 / 20%))",
              boxShadow: "inset 0 0 80px oklch(0.68 0.20 25 / 40%)",
              opacity: noOpacity,
            }}
          />

          {/* SKIP overlay */}
          <motion.div
            style={{
              ...OVERLAY_BASE_STYLE,
              background:
                "linear-gradient(180deg, oklch(0.50 0.15 290 / 40%), oklch(0.50 0.15 290 / 20%))",
              boxShadow: "inset 0 0 80px oklch(0.50 0.15 290 / 40%)",
              opacity: skipOpacity,
            }}
          />
        </div>
      </motion.div>
    );
  }
);
