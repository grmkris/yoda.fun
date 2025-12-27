"use client";

import { Gift } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useClaimableRewards } from "@/hooks/use-rewards";

export function RewardIndicator() {
  const { data } = useClaimableRewards();
  const count = data?.count ?? 0;

  return (
    <Link
      className="relative flex h-9 items-center gap-1.5 rounded-lg px-3 transition-all hover:opacity-80"
      href="/rewards"
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
    >
      <Gift
        className="h-4 w-4"
        style={{
          color: count > 0 ? "oklch(0.80 0.16 50)" : "oklch(0.65 0.04 280)",
        }}
      />

      <AnimatePresence mode="wait">
        {count > 0 && (
          <motion.span
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-bold text-xs"
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
    </Link>
  );
}
