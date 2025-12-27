"use client";

import { Check, TrendingUp, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRewardSummary } from "@/hooks/use-rewards";

const VOLUME_MILESTONES = [
  { amount: 100, reward: 5 },
  { amount: 500, reward: 15 },
  { amount: 1000, reward: 50 },
];

const WIN_STREAK_MILESTONES = [
  { streak: 3, reward: 2 },
  { streak: 5, reward: 5 },
  { streak: 10, reward: 15 },
];

export function VolumeCard() {
  const { data, isLoading } = useRewardSummary();
  const volume = data?.volume;

  const totalVolume = volume?.total ?? 0;
  const _nextMilestone = volume?.nextMilestone;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-5"
      initial={{ opacity: 0, y: 20 }}
      style={{
        background: "oklch(0.10 0.03 280 / 60%)",
        backdropFilter: "blur(20px)",
        border: "1px solid oklch(0.65 0.25 290 / 20%)",
      }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.60 0.20 200))",
            boxShadow: "0 0 15px oklch(0.72 0.18 175 / 30%)",
          }}
        >
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3
            className="font-heading font-semibold"
            style={{ color: "oklch(0.95 0.02 280)" }}
          >
            Betting Volume
          </h3>
          {isLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <p className="text-sm" style={{ color: "oklch(0.65 0.04 280)" }}>
              ${totalVolume.toFixed(2)} total
            </p>
          )}
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        {VOLUME_MILESTONES.map((milestone, idx) => {
          const isCompleted =
            volume?.[`milestone${milestone.amount}` as keyof typeof volume] ??
            false;
          const progress = isCompleted
            ? 100
            : Math.min((totalVolume / milestone.amount) * 100, 100);

          return (
            <div key={milestone.amount}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span
                  style={{
                    color: isCompleted
                      ? "oklch(0.72 0.18 175)"
                      : "oklch(0.75 0.04 280)",
                  }}
                >
                  ${milestone.amount} volume
                </span>
                <span
                  className="font-medium"
                  style={{
                    color: isCompleted
                      ? "oklch(0.72 0.18 175)"
                      : "oklch(0.65 0.04 280)",
                  }}
                >
                  {isCompleted ? (
                    <span className="flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> +${milestone.reward}
                    </span>
                  ) : (
                    `+$${milestone.reward}`
                  )}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full"
                style={{ background: "oklch(0.15 0.02 280)" }}
              >
                <motion.div
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  style={{
                    background: isCompleted
                      ? "oklch(0.72 0.18 175)"
                      : "linear-gradient(90deg, oklch(0.72 0.18 175 / 50%), oklch(0.72 0.18 175))",
                  }}
                  transition={{ delay: idx * 0.1 + 0.3, duration: 0.6 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function WinStreakCard() {
  const { data, isLoading } = useRewardSummary();
  const winStreak = data?.winStreak;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-5"
      initial={{ opacity: 0, y: 20 }}
      style={{
        background: "oklch(0.10 0.03 280 / 60%)",
        backdropFilter: "blur(20px)",
        border: "1px solid oklch(0.65 0.25 290 / 20%)",
      }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.80 0.16 90), oklch(0.70 0.18 60))",
            boxShadow: "0 0 15px oklch(0.80 0.16 90 / 30%)",
          }}
        >
          <Trophy className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3
            className="font-heading font-semibold"
            style={{ color: "oklch(0.95 0.02 280)" }}
          >
            Win Streak Bonuses
          </h3>
          <p className="text-sm" style={{ color: "oklch(0.65 0.04 280)" }}>
            Consecutive wins unlock rewards
          </p>
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        {WIN_STREAK_MILESTONES.map((milestone, _idx) => {
          const isCompleted =
            winStreak?.[
              `milestone${milestone.streak}` as keyof typeof winStreak
            ] ?? false;

          return (
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2"
              key={milestone.streak}
              style={{
                background: isCompleted
                  ? "oklch(0.80 0.16 90 / 15%)"
                  : "oklch(0.12 0.02 280 / 50%)",
                border: isCompleted
                  ? "1px solid oklch(0.80 0.16 90 / 30%)"
                  : "1px solid oklch(0.65 0.25 290 / 10%)",
              }}
            >
              <span
                className="font-medium text-sm"
                style={{
                  color: isCompleted
                    ? "oklch(0.80 0.16 90)"
                    : "oklch(0.75 0.04 280)",
                }}
              >
                {milestone.streak} wins in a row
              </span>
              <span
                className="flex items-center gap-1 font-semibold text-sm"
                style={{
                  color: isCompleted
                    ? "oklch(0.80 0.16 90)"
                    : "oklch(0.65 0.04 280)",
                }}
              >
                {isCompleted && <Check className="h-3.5 w-3.5" />}
                +${milestone.reward}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function FirstBetCard() {
  const { data, isLoading } = useRewardSummary();
  const firstBet = data?.firstBetBonus;
  const isEarned = firstBet?.earned ?? false;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between rounded-xl p-4"
      initial={{ opacity: 0, y: 20 }}
      style={{
        background: isEarned
          ? "oklch(0.72 0.18 175 / 15%)"
          : "oklch(0.10 0.03 280 / 60%)",
        backdropFilter: "blur(20px)",
        border: isEarned
          ? "1px solid oklch(0.72 0.18 175 / 30%)"
          : "1px solid oklch(0.65 0.25 290 / 20%)",
      }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            background: isEarned
              ? "oklch(0.72 0.18 175)"
              : "oklch(0.20 0.02 280)",
          }}
        >
          {isEarned ? (
            <Check className="h-4 w-4 text-white" />
          ) : (
            <Trophy
              className="h-4 w-4"
              style={{ color: "oklch(0.50 0.04 280)" }}
            />
          )}
        </div>
        <div>
          <h3
            className="font-heading font-semibold"
            style={{
              color: isEarned ? "oklch(0.72 0.18 175)" : "oklch(0.95 0.02 280)",
            }}
          >
            First Bet Bonus
          </h3>
          <p className="text-sm" style={{ color: "oklch(0.65 0.04 280)" }}>
            {isEarned ? "Claimed!" : "Place your first bet to earn"}
          </p>
        </div>
      </div>
      <span
        className="font-bold text-lg"
        style={{
          color: isEarned ? "oklch(0.72 0.18 175)" : "oklch(0.50 0.04 280)",
        }}
      >
        +$5
      </span>
    </motion.div>
  );
}
