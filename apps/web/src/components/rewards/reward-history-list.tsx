"use client";

import { Flame, Gift, TrendingUp, Trophy, Users } from "lucide-react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRewardHistory } from "@/hooks/use-rewards";

const REWARD_TYPE_CONFIG = {
  DAILY_STREAK: {
    icon: Flame,
    label: "Daily Streak",
    color: "oklch(0.80 0.16 50)",
  },
  FIRST_BET: {
    icon: Gift,
    label: "First Bet Bonus",
    color: "oklch(0.72 0.18 175)",
  },
  WIN_STREAK: {
    icon: Trophy,
    label: "Win Streak",
    color: "oklch(0.80 0.16 90)",
  },
  REFERRAL_BONUS: {
    icon: Users,
    label: "Referral",
    color: "oklch(0.65 0.25 290)",
  },
  VOLUME_MILESTONE: {
    icon: TrendingUp,
    label: "Volume Milestone",
    color: "oklch(0.72 0.18 175)",
  },
};

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function RewardHistoryList() {
  const { data, isLoading } = useRewardHistory({ limit: 10 });
  const rewards = data?.rewards ?? [];

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
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <h3
        className="mb-4 font-heading font-semibold text-lg"
        style={{ color: "oklch(0.95 0.02 280)" }}
      >
        Recent Rewards
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {[...new Array(5)].map((_, i) => (
            <Skeleton className="h-14 w-full" key={i} />
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <div
          className="py-8 text-center"
          style={{ color: "oklch(0.55 0.04 280)" }}
        >
          No rewards yet. Start earning!
        </div>
      ) : (
        <div className="space-y-2">
          {rewards.map((reward, idx) => {
            const config =
              REWARD_TYPE_CONFIG[
                reward.rewardType as keyof typeof REWARD_TYPE_CONFIG
              ];
            if (!config) {
              return null;
            }

            const Icon = config.icon;

            return (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between rounded-lg px-3 py-2.5"
                initial={{ opacity: 0, x: -10 }}
                key={reward.id}
                style={{
                  background: "oklch(0.12 0.02 280 / 50%)",
                  border: "1px solid oklch(0.65 0.25 290 / 10%)",
                }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      background: `${config.color}20`,
                      border: `1px solid ${config.color}40`,
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: config.color }} />
                  </div>
                  <div>
                    <div
                      className="font-medium text-sm"
                      style={{ color: "oklch(0.90 0.02 280)" }}
                    >
                      {config.label}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "oklch(0.55 0.04 280)" }}
                    >
                      {formatDate(reward.createdAt)}
                    </div>
                  </div>
                </div>
                <span className="font-semibold" style={{ color: config.color }}>
                  +${Number(reward.amount).toFixed(2)}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
