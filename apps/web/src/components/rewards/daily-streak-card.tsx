"use client";

import { Gift } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClaimDaily, usePoints } from "@/hooks/use-points";

function ClaimButton({
  isLoading,
  canClaim,
  isPending,
  onClaim,
}: {
  isLoading: boolean;
  canClaim: boolean;
  isPending: boolean;
  onClaim: () => void;
}) {
  if (isLoading) {
    return <Skeleton className="h-12 w-40" />;
  }
  if (canClaim) {
    return (
      <Button
        className="relative overflow-hidden px-8 py-3"
        disabled={isPending}
        onClick={onClaim}
        size="lg"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
          border: "none",
        }}
      >
        <Gift className="mr-2 h-5 w-5" />
        Claim 5 Points
      </Button>
    );
  }
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-6 py-3"
      style={{
        background: "oklch(0.15 0.02 280 / 80%)",
        border: "1px solid oklch(0.65 0.25 290 / 15%)",
      }}
    >
      <span className="font-medium" style={{ color: "oklch(0.72 0.18 175)" }}>
        ✓ Claimed today
      </span>
    </div>
  );
}

export function DailyStreakCard() {
  const { data, isLoading } = usePoints();
  const claimMutation = useClaimDaily();

  const canClaim = data?.canClaimDaily ?? false;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      style={{
        background: "oklch(0.10 0.03 280 / 60%)",
        backdropFilter: "blur(20px)",
        border: "1px solid oklch(0.65 0.25 290 / 20%)",
      }}
      transition={{ duration: 0.5 }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl"
        style={{ background: "oklch(0.65 0.25 290 / 15%)" }}
      />

      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
              boxShadow: "0 0 20px oklch(0.72 0.18 175 / 30%)",
            }}
          >
            <Gift className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3
              className="font-heading font-semibold text-lg"
              style={{ color: "oklch(0.95 0.02 280)" }}
            >
              Daily Points
            </h3>
            <p className="text-sm" style={{ color: "oklch(0.65 0.04 280)" }}>
              Claim 5 free points every day
            </p>
          </div>
        </div>
      </div>

      {/* Claim button */}
      <div className="relative flex justify-center">
        <ClaimButton
          canClaim={canClaim}
          isLoading={isLoading}
          isPending={claimMutation.isPending}
          onClaim={() => claimMutation.mutate()}
        />
      </div>
    </motion.div>
  );
}
