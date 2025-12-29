"use client";

import { Check, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useRewardSummary } from "@/hooks/use-rewards";

// Points-based win streak milestones (from reward-service)
const WIN_STREAK_MILESTONES = [
  { streak: 3, reward: 5 },
  { streak: 5, reward: 10 },
  { streak: 10, reward: 25 },
];

export function WinStreakCard() {
  const { data } = useRewardSummary();
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
                {isCompleted && <Check className="h-3.5 w-3.5" />}+
                {milestone.reward} pts
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function FirstBetCard() {
  const { data } = useRewardSummary();
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
        +10 pts
      </span>
    </motion.div>
  );
}
