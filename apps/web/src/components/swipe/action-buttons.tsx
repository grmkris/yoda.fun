"use client";

import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import { Heart, X } from "lucide-react";

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
        gap: "1rem",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <button
        aria-label="Reject"
        disabled={disabled}
        onClick={onSwipeLeft}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.transform = `scale(${NUMERIC_CONSTANTS.swipe.buttonScale})`;
            e.currentTarget.style.boxShadow = `0 4px 12px rgba(239, 68, 68, ${NUMERIC_CONSTANTS.swipe.overlayOpacity})`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "none";
        }}
        style={{
          width: `${NUMERIC_CONSTANTS.swipe.buttonSize}px`,
          height: `${NUMERIC_CONSTANTS.swipe.buttonSize}px`,
          borderRadius: "50%",
          border: `${NUMERIC_CONSTANTS.swipe.buttonBorderWidth}px solid rgb(239, 68, 68)`,
          background: "white",
          color: "rgb(239, 68, 68)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? NUMERIC_CONSTANTS.swipe.disabledOpacity : 1,
          transition: `transform ${NUMERIC_CONSTANTS.swipe.transitionDuration}s, box-shadow ${NUMERIC_CONSTANTS.swipe.transitionDuration}s`,
        }}
        type="button"
      >
        <X
          size={NUMERIC_CONSTANTS.swipe.iconSize}
          strokeWidth={NUMERIC_CONSTANTS.swipe.iconStrokeWidth}
        />
      </button>

      <button
        aria-label="Like"
        disabled={disabled}
        onClick={onSwipeRight}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.transform = `scale(${NUMERIC_CONSTANTS.swipe.buttonScale})`;
            e.currentTarget.style.boxShadow = `0 4px 12px rgba(34, 197, 94, ${NUMERIC_CONSTANTS.swipe.overlayOpacity})`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "none";
        }}
        style={{
          width: `${NUMERIC_CONSTANTS.swipe.buttonSize}px`,
          height: `${NUMERIC_CONSTANTS.swipe.buttonSize}px`,
          borderRadius: "50%",
          border: `${NUMERIC_CONSTANTS.swipe.buttonBorderWidth}px solid rgb(34, 197, 94)`,
          background: "white",
          color: "rgb(34, 197, 94)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? NUMERIC_CONSTANTS.swipe.disabledOpacity : 1,
          transition: `transform ${NUMERIC_CONSTANTS.swipe.transitionDuration}s, box-shadow ${NUMERIC_CONSTANTS.swipe.transitionDuration}s`,
        }}
        type="button"
      >
        <Heart
          size={NUMERIC_CONSTANTS.swipe.iconSize}
          strokeWidth={NUMERIC_CONSTANTS.swipe.iconStrokeWidth}
        />
      </button>
    </div>
  );
}
