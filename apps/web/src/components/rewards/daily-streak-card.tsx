"use client";

import { Check, Clock, Flame, Gift } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClaimDailyStreak, useRewardSummary } from "@/hooks/use-rewards";

const DAILY_AMOUNTS = [1, 2, 3, 4, 5, 6, 7];

function formatTimeRemaining(date: Date | null): string {
  if (!date) {
    return "";
  }
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) {
    return "Ready!";
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function DailyStreakCard() {
  const { data, isLoading } = useRewardSummary();
  const claimMutation = useClaimDailyStreak();

  const dailyStreak = data?.dailyStreak;
  const currentDay = dailyStreak?.currentDay ?? 0;
  const canClaim = dailyStreak?.canClaim ?? false;
  const nextClaimAt = dailyStreak?.nextClaimAt
    ? new Date(dailyStreak.nextClaimAt)
    : null;
  const nextAmount = dailyStreak?.nextAmount ?? DAILY_AMOUNTS[0];

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      style={{
        background: "oklch(0.10 0.03 280 / 60%)",
        backdropFilter: "blur(20px)",
        border: "1px solid oklch(0.65 0.25 290 / 20%)",
        boxShadow: `
          0 0 60px oklch(0.65 0.25 290 / 10%),
          inset 0 1px 0 oklch(1 0 0 / 8%)
        `,
      }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Background effects */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl"
        style={{ background: "oklch(0.80 0.16 50 / 15%)" }}
      />

      {/* Header */}
      <div className="relative mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.80 0.16 50), oklch(0.70 0.20 30))",
              boxShadow: "0 0 20px oklch(0.80 0.16 50 / 30%)",
            }}
          >
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3
              className="font-heading font-semibold text-lg"
              style={{ color: "oklch(0.95 0.02 280)" }}
            >
              Daily Streak
            </h3>
            <p className="text-sm" style={{ color: "oklch(0.65 0.04 280)" }}>
              {currentDay > 0
                ? `Day ${currentDay} streak`
                : "Start your streak!"}
            </p>
          </div>
        </div>

        {/* Claim button or timer */}
        {isLoading ? (
          <Skeleton className="h-10 w-24" />
        ) : canClaim ? (
          <Button
            className="relative overflow-hidden"
            disabled={claimMutation.isPending}
            onClick={() => claimMutation.mutate()}
            size="sm"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
              border: "none",
            }}
          >
            <Gift className="mr-2 h-4 w-4" />
            Claim ${nextAmount}
          </Button>
        ) : (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              background: "oklch(0.15 0.02 280 / 80%)",
              border: "1px solid oklch(0.65 0.25 290 / 15%)",
            }}
          >
            <Clock
              className="h-4 w-4"
              style={{ color: "oklch(0.65 0.04 280)" }}
            />
            <span
              className="font-medium text-sm"
              style={{ color: "oklch(0.80 0.04 280)" }}
            >
              {formatTimeRemaining(nextClaimAt)}
            </span>
          </div>
        )}
      </div>

      {/* 7-day progress */}
      <div
        className="grid grid-cols-7 gap-2 rounded-xl p-3"
        style={{
          background: "oklch(0.08 0.02 270 / 50%)",
          border: "1px solid oklch(0.65 0.25 290 / 10%)",
        }}
      >
        {DAILY_AMOUNTS.map((amount, idx) => {
          const dayNum = idx + 1;
          const isCompleted = dayNum <= currentDay;
          const isCurrent = dayNum === currentDay + 1 && canClaim;
          const _isFuture =
            dayNum > currentDay + 1 || (!canClaim && dayNum === currentDay + 1);

          return (
            <motion.div
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-1"
              initial={{ scale: 0.8, opacity: 0 }}
              key={dayNum}
              transition={{ delay: idx * 0.05 + 0.2 }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg font-medium text-sm transition-all"
                style={{
                  background: isCompleted
                    ? "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))"
                    : isCurrent
                      ? "linear-gradient(135deg, oklch(0.80 0.16 50), oklch(0.70 0.20 30))"
                      : "oklch(0.15 0.02 280 / 60%)",
                  border: isCurrent
                    ? "2px solid oklch(0.80 0.16 50)"
                    : "1px solid oklch(0.65 0.25 290 / 15%)",
                  color:
                    isCompleted || isCurrent ? "white" : "oklch(0.50 0.04 280)",
                  boxShadow: isCurrent
                    ? "0 0 15px oklch(0.80 0.16 50 / 40%)"
                    : "none",
                }}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : `$${amount}`}
              </div>
              <span
                className="font-medium text-xs"
                style={{
                  color: isCompleted
                    ? "oklch(0.72 0.18 175)"
                    : "oklch(0.50 0.04 280)",
                }}
              >
                Day {dayNum}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Info text */}
      <p
        className="mt-4 text-center text-xs"
        style={{ color: "oklch(0.55 0.04 280)" }}
      >
        Claim daily to build your streak. Miss a day and it resets!
      </p>
    </motion.div>
  );
}
