"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

function getUrgencyColors(hoursLeft: number): {
  text: string;
  bg: string;
  glow: string;
  border: string;
} {
  if (hoursLeft > 24) {
    return {
      text: "oklch(0.7 0.15 200)",
      bg: "oklch(0.7 0.15 200 / 10%)",
      glow: "0 0 12px oklch(0.7 0.15 200 / 25%)",
      border: "oklch(0.7 0.15 200 / 30%)",
    };
  }
  if (hoursLeft > 1) {
    return {
      text: "oklch(0.8 0.18 85)",
      bg: "oklch(0.8 0.18 85 / 10%)",
      glow: "0 0 12px oklch(0.8 0.18 85 / 30%)",
      border: "oklch(0.8 0.18 85 / 35%)",
    };
  }
  return {
    text: "oklch(0.68 0.20 25)",
    bg: "oklch(0.68 0.20 25 / 12%)",
    glow: "0 0 15px oklch(0.68 0.20 25 / 40%)",
    border: "oklch(0.68 0.20 25 / 40%)",
  };
}

interface TimeSegmentProps {
  value: number;
  label: string;
  colors: ReturnType<typeof getUrgencyColors>;
  isCritical: boolean;
}

function TimeSegment({ value, label, colors, isCritical }: TimeSegmentProps) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: colors.glow,
        animation: isCritical ? "glow-pulse 2s ease-in-out infinite" : "none",
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          className="font-accent font-bold text-lg tabular-nums leading-none"
          exit={{ y: 10, opacity: 0 }}
          initial={{ y: -10, opacity: 0 }}
          key={value}
          style={{ color: colors.text }}
          transition={{ duration: 0.2 }}
        >
          {String(value).padStart(2, "0")}
        </motion.span>
      </AnimatePresence>
      <span
        className="text-[10px] uppercase tracking-wider opacity-60"
        style={{ color: colors.text }}
      >
        {label}
      </span>
    </div>
  );
}

interface CountdownProps {
  targetDate: Date | string;
  label?: string;
  variant?: "full" | "compact";
  showSeconds?: boolean;
}

export function Countdown({
  targetDate,
  label,
  variant = "full",
  showSeconds = true,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(new Date(targetDate))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(new Date(targetDate)));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const hoursLeft = timeLeft.days * 24 + timeLeft.hours + timeLeft.minutes / 60;
  const colors = getUrgencyColors(hoursLeft);
  const isCritical = hoursLeft <= 1;
  const isExpired = timeLeft.total <= 0;

  if (variant === "compact") {
    const parts: string[] = [];
    if (timeLeft.days > 0) {
      parts.push(`${timeLeft.days}d`);
    }
    if (timeLeft.hours > 0 || timeLeft.days > 0) {
      parts.push(`${timeLeft.hours}h`);
    }
    parts.push(`${timeLeft.minutes}m`);

    return (
      <span
        className="font-accent text-sm tabular-nums"
        style={{ color: isExpired ? "oklch(0.5 0.04 280)" : colors.text }}
      >
        {isExpired ? "Ended" : parts.join(" ")}
      </span>
    );
  }

  if (isExpired) {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: "oklch(0.5 0.04 280)" }}
          >
            {label}
          </span>
        )}
        <div
          className="rounded-xl px-4 py-3 text-center"
          style={{
            background: "oklch(0.10 0.03 280 / 50%)",
            border: "1px solid oklch(0.3 0.04 280 / 30%)",
          }}
        >
          <span
            className="font-heading font-medium text-sm"
            style={{ color: "oklch(0.5 0.04 280)" }}
          >
            Ended
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: "oklch(0.6 0.04 280)" }}
        >
          {label}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <TimeSegment
          colors={colors}
          isCritical={isCritical}
          label="d"
          value={timeLeft.days}
        />
        <TimeSegment
          colors={colors}
          isCritical={isCritical}
          label="h"
          value={timeLeft.hours}
        />
        <TimeSegment
          colors={colors}
          isCritical={isCritical}
          label="m"
          value={timeLeft.minutes}
        />
        {showSeconds && (
          <TimeSegment
            colors={colors}
            isCritical={isCritical}
            label="s"
            value={timeLeft.seconds}
          />
        )}
      </div>
    </div>
  );
}

interface CompactCountdownRowProps {
  votingEndsAt: Date | string;
  resolutionDeadline: Date | string;
}

export function CompactCountdownRow({
  votingEndsAt,
  resolutionDeadline,
}: CompactCountdownRowProps) {
  return (
    <div
      className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2"
      style={{
        background: "oklch(0.08 0.02 280 / 60%)",
        border: "1px solid oklch(0.3 0.04 280 / 20%)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: "oklch(0.5 0.04 280)" }}>
          Voting:
        </span>
        <Countdown targetDate={votingEndsAt} variant="compact" />
      </div>
      <span style={{ color: "oklch(0.3 0.04 280)" }}>|</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: "oklch(0.5 0.04 280)" }}>
          Resolves:
        </span>
        <Countdown targetDate={resolutionDeadline} variant="compact" />
      </div>
    </div>
  );
}
