"use client";

import { Coins } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePoints } from "@/hooks/use-points";
import { useClaimableRewards } from "@/hooks/use-rewards";
import { DailyStreakCard } from "./rewards/daily-streak-card";
import { ReferralCard } from "./rewards/referral-card";

function RewardsHeader() {
  return (
    <div
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
        <Coins className="h-5 w-5 text-white" />
      </div>
      Rewards
    </div>
  );
}

function RewardsContent() {
  return (
    <div className="space-y-4">
      <DailyStreakCard />
      <ReferralCard />
    </div>
  );
}

export function PointsDisplay() {
  const { data, isLoading, error } = usePoints();
  const { data: rewards } = useClaimableRewards();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const hasRewards = (rewards?.count ?? 0) > 0 || data?.canClaimDaily;

  if (isLoading) {
    return <Skeleton className="h-8 w-24 rounded-full" />;
  }

  if (error || !data) {
    return null;
  }

  return (
    <>
      <button
        className="group relative flex items-center gap-1.5 rounded-full px-2 py-1 transition-all duration-200"
        onClick={() => setOpen(true)}
        style={{
          background: hasRewards
            ? "linear-gradient(135deg, oklch(0.15 0.06 75 / 90%), oklch(0.12 0.04 60 / 90%))"
            : "oklch(0.12 0.02 270 / 80%)",
          border: hasRewards
            ? "1px solid oklch(0.75 0.14 75 / 50%)"
            : "1px solid oklch(0.65 0.25 290 / 25%)",
          boxShadow: hasRewards
            ? "0 0 16px oklch(0.75 0.14 75 / 25%), inset 0 1px 0 oklch(1 0 0 / 10%)"
            : "inset 0 1px 0 oklch(1 0 0 / 5%)",
        }}
        type="button"
      >
        <span className="flex items-center gap-1">
          <Coins
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110"
            style={{ color: "oklch(0.82 0.14 85)" }}
          />
          <span
            className="font-semibold text-xs tabular-nums"
            style={{ color: "oklch(0.92 0.03 85)" }}
          >
            {data.points.toLocaleString()}
          </span>
        </span>

        {data.freeSkipsRemaining > 0 && (
          <span
            className="text-[10px]"
            style={{ color: "oklch(0.55 0.02 270)" }}
            title={`${data.freeSkipsRemaining} free skips remaining today`}
          >
            · {data.freeSkipsRemaining}
          </span>
        )}

        <AnimatePresence>
          {hasRewards && (
            <motion.span
              animate={{ scale: 1, opacity: 1 }}
              className="relative flex h-2 w-2"
              exit={{ scale: 0, opacity: 0 }}
              initial={{ scale: 0, opacity: 0 }}
            >
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: "oklch(0.75 0.14 75)" }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: "oklch(0.82 0.14 75)" }}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {isMobile ? (
        <Drawer direction="bottom" onOpenChange={setOpen} open={open}>
          <DrawerContent
            className="rounded-t-3xl"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.12 0.03 280 / 98%) 0%, oklch(0.08 0.02 270 / 98%) 100%)",
              boxShadow: "0 -4px 30px oklch(0.08 0.02 270 / 60%)",
            }}
          >
            <div className="p-6">
              <RewardsHeader />
            </div>
            <div
              className="overflow-y-auto px-6 pb-6"
              style={{ maxHeight: "calc(80vh - 120px)" }}
            >
              <RewardsContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle asChild>
                <RewardsHeader />
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <RewardsContent />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

export { PointsDisplay as BalanceDisplay };
