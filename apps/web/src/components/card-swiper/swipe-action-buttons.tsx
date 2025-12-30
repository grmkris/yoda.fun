"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { motion } from "motion/react";
import { useHaptic } from "@/hooks/use-haptic";

interface SwipeActionButtonsProps {
  onYes: () => void;
  onNo: () => void;
  onSkip: () => void;
  disabled?: boolean;
}

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant: "no" | "skip" | "yes";
  children: React.ReactNode;
}

const buttonConfig = {
  no: {
    gradient:
      "linear-gradient(135deg, oklch(0.68 0.22 25), oklch(0.55 0.20 20))",
    glow: "oklch(0.68 0.22 25 / 50%)",
    ring: "oklch(0.68 0.22 25 / 30%)",
    hoverGlow:
      "0 0 40px oklch(0.68 0.22 25 / 60%), 0 0 80px oklch(0.68 0.22 25 / 30%)",
    size: 64,
  },
  skip: {
    gradient:
      "linear-gradient(135deg, oklch(0.35 0.12 290), oklch(0.28 0.10 280))",
    glow: "oklch(0.50 0.15 290 / 40%)",
    ring: "oklch(0.50 0.15 290 / 25%)",
    hoverGlow:
      "0 0 30px oklch(0.50 0.15 290 / 50%), 0 0 60px oklch(0.50 0.15 290 / 25%)",
    size: 52,
  },
  yes: {
    gradient:
      "linear-gradient(135deg, oklch(0.72 0.20 175), oklch(0.58 0.18 180))",
    glow: "oklch(0.72 0.20 175 / 50%)",
    ring: "oklch(0.72 0.20 175 / 30%)",
    hoverGlow:
      "0 0 40px oklch(0.72 0.20 175 / 60%), 0 0 80px oklch(0.72 0.20 175 / 30%)",
    size: 64,
  },
} as const;

function ActionButton({
  onClick,
  disabled,
  variant,
  children,
}: ActionButtonProps) {
  const config = buttonConfig[variant];
  const { vibrateOnSwipe } = useHaptic();

  const handleClick = () => {
    if (disabled) {
      return;
    }
    vibrateOnSwipe();
    onClick();
  };

  return (
    <motion.button
      className="relative flex items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      disabled={disabled}
      onClick={handleClick}
      style={{
        width: config.size,
        height: config.size,
        background: config.gradient,
        boxShadow: `0 0 20px ${config.glow}, inset 0 1px 0 oklch(1 0 0 / 20%)`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      whileHover={
        disabled
          ? undefined
          : {
              scale: 1.1,
              boxShadow: config.hoverGlow,
            }
      }
      whileTap={disabled ? undefined : { scale: 0.9 }}
    >
      {/* Outer ring pulse */}
      <motion.div
        animate={
          disabled
            ? { opacity: 0.3, scale: 1 }
            : {
                opacity: [0.5, 0.2, 0.5],
                scale: [1, 1.05, 1],
              }
        }
        className="pointer-events-none absolute rounded-full"
        style={{
          width: config.size + 16,
          height: config.size + 16,
          border: `2px solid ${config.ring}`,
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Icon */}
      <span className="relative z-10 text-white drop-shadow-lg">
        {children}
      </span>
    </motion.button>
  );
}

export function SwipeActionButtons({
  onYes,
  onNo,
  onSkip,
  disabled = false,
}: SwipeActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-6 py-6">
      {/* NO button */}
      <ActionButton disabled={disabled} onClick={onNo} variant="no">
        <X className="h-7 w-7" strokeWidth={2.5} />
      </ActionButton>

      {/* SKIP button - smaller, centered lower */}
      <ActionButton disabled={disabled} onClick={onSkip} variant="skip">
        <ChevronDown className="h-6 w-6" strokeWidth={2.5} />
      </ActionButton>

      {/* YES button */}
      <ActionButton disabled={disabled} onClick={onYes} variant="yes">
        <Check className="h-7 w-7" strokeWidth={2.5} />
      </ActionButton>
    </div>
  );
}
