"use client";

import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { Sparkles, X } from "lucide-react";

export interface ActionButtonsProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  disabled?: boolean;
  className?: string;
}

export function ActionButtons({
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  className = "",
}: ActionButtonsProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        gap: "1.5rem",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* NO / Reject Button - Astral Coral */}
      <button
        aria-label="Reject"
        disabled={disabled}
        onClick={onSwipeLeft}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.transform = `scale(${NUMERIC_CONSTANTS.swipe.buttonScale})`;
            e.currentTarget.style.boxShadow =
              "0 0 30px oklch(0.68 0.20 25 / 50%), 0 0 60px oklch(0.68 0.20 25 / 25%)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow =
            "0 0 20px oklch(0.68 0.20 25 / 30%), inset 0 1px 0 oklch(1 0 0 / 10%)";
        }}
        style={{
          width: `${NUMERIC_CONSTANTS.swipe.buttonSize + 8}px`,
          height: `${NUMERIC_CONSTANTS.swipe.buttonSize + 8}px`,
          borderRadius: "50%",
          border: "2px solid oklch(0.68 0.20 25)",
          background:
            "linear-gradient(135deg, oklch(0.22 0.12 25), oklch(0.12 0.03 280))",
          color: "oklch(0.75 0.18 25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? NUMERIC_CONSTANTS.swipe.disabledOpacity : 1,
          transition: `transform ${NUMERIC_CONSTANTS.swipe.transitionDuration}s ease-out, box-shadow ${NUMERIC_CONSTANTS.swipe.transitionDuration}s ease-out`,
          boxShadow:
            "0 0 20px oklch(0.68 0.20 25 / 30%), inset 0 1px 0 oklch(1 0 0 / 10%)",
        }}
        type="button"
      >
        <X
          size={NUMERIC_CONSTANTS.swipe.iconSize}
          strokeWidth={NUMERIC_CONSTANTS.swipe.iconStrokeWidth}
        />
      </button>

      {/* YES / Accept Button - Celestial Teal */}
      <button
        aria-label="Accept"
        disabled={disabled}
        onClick={onSwipeRight}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.transform = `scale(${NUMERIC_CONSTANTS.swipe.buttonScale})`;
            e.currentTarget.style.boxShadow =
              "0 0 30px oklch(0.72 0.18 175 / 50%), 0 0 60px oklch(0.72 0.18 175 / 25%)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow =
            "0 0 20px oklch(0.72 0.18 175 / 30%), inset 0 1px 0 oklch(1 0 0 / 10%)";
        }}
        style={{
          width: `${NUMERIC_CONSTANTS.swipe.buttonSize + 8}px`,
          height: `${NUMERIC_CONSTANTS.swipe.buttonSize + 8}px`,
          borderRadius: "50%",
          border: "2px solid oklch(0.72 0.18 175)",
          background:
            "linear-gradient(135deg, oklch(0.25 0.10 175), oklch(0.12 0.03 280))",
          color: "oklch(0.80 0.16 175)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? NUMERIC_CONSTANTS.swipe.disabledOpacity : 1,
          transition: `transform ${NUMERIC_CONSTANTS.swipe.transitionDuration}s ease-out, box-shadow ${NUMERIC_CONSTANTS.swipe.transitionDuration}s ease-out`,
          boxShadow:
            "0 0 20px oklch(0.72 0.18 175 / 30%), inset 0 1px 0 oklch(1 0 0 / 10%)",
        }}
        type="button"
      >
        <Sparkles
          size={NUMERIC_CONSTANTS.swipe.iconSize}
          strokeWidth={NUMERIC_CONSTANTS.swipe.iconStrokeWidth}
        />
      </button>
    </div>
  );
}
