"use client";

import { Gift } from "lucide-react";
import { motion } from "motion/react";
import { DailyStreakCard } from "@/components/rewards/daily-streak-card";
import {
  FirstBetCard,
  WinStreakCard,
} from "@/components/rewards/milestone-card";
import { ReferralCard } from "@/components/rewards/referral-card";
import { RewardHistoryList } from "@/components/rewards/reward-history-list";

export function RewardsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.80 0.16 50), oklch(0.70 0.20 30))",
              boxShadow: "0 0 30px oklch(0.80 0.16 50 / 30%)",
            }}
          >
            <Gift className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1
              className="font-bold font-heading text-3xl"
              style={{ color: "oklch(0.95 0.02 280)" }}
            >
              Rewards
            </h1>
            <p style={{ color: "oklch(0.65 0.04 280)" }}>
              Earn bonuses for being active
            </p>
          </div>
        </div>
      </motion.div>

      {/* Daily Streak - Full width hero */}
      <DailyStreakCard />

      {/* First Bet Bonus */}
      <FirstBetCard />

      {/* Two column grid for milestones */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WinStreakCard />
      </div>

      {/* Referral section */}
      <ReferralCard />

      {/* History */}
      <RewardHistoryList />
    </div>
  );
}
