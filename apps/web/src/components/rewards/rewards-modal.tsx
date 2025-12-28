"use client";

import { Gift } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useClaimableRewards } from "@/hooks/use-rewards";
import { DailyStreakCard } from "./daily-streak-card";
import { ReferralCard } from "./referral-card";

export function RewardsModal({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { data } = useClaimableRewards();
  const count = data?.count ?? 0;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <button
          className="relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-all hover:opacity-80"
          style={{
            background:
              count > 0
                ? "oklch(0.80 0.16 50 / 20%)"
                : "oklch(0.15 0.02 280 / 60%)",
            border:
              count > 0
                ? "1px solid oklch(0.80 0.16 50 / 40%)"
                : "1px solid oklch(0.65 0.25 290 / 20%)",
          }}
          type="button"
        >
          <Gift
            className={compact ? "h-4 w-4" : "h-4 w-4"}
            style={{
              color: count > 0 ? "oklch(0.80 0.16 50)" : "oklch(0.65 0.04 280)",
            }}
          />

          <AnimatePresence mode="wait">
            {count > 0 && (
              <motion.span
                animate={{ scale: 1, opacity: 1 }}
                className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-bold text-xs"
                exit={{ scale: 0.8, opacity: 0 }}
                initial={{ scale: 0.8, opacity: 0 }}
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.80 0.16 50), oklch(0.70 0.20 30))",
                  color: "white",
                  boxShadow: "0 0 10px oklch(0.80 0.16 50 / 50%)",
                }}
              >
                {count}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto border-0 p-0"
        style={{
          background: "oklch(0.08 0.02 270)",
          border: "1px solid oklch(0.65 0.25 290 / 20%)",
        }}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle
            className="flex items-center gap-3 font-heading text-xl"
            style={{ color: "oklch(0.95 0.02 280)" }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.80 0.16 50), oklch(0.70 0.20 30))",
                boxShadow: "0 0 20px oklch(0.80 0.16 50 / 30%)",
              }}
            >
              <Gift className="h-5 w-5 text-white" />
            </div>
            Rewards
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-6">
          <DailyStreakCard />
          <ReferralCard />
        </div>
      </DialogContent>
    </Dialog>
  );
}
