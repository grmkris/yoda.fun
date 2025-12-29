"use client";

import { Coins, Gift } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClaimDaily, usePoints } from "@/hooks/use-points";

export function BalanceDisplay() {
  const { data, isLoading, error } = usePoints();
  const claimDaily = useClaimDaily();

  if (isLoading) {
    return <Skeleton className="h-7 w-20" />;
  }

  if (error || !data) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Daily claim button */}
      {data.canClaimDaily && (
        <Button
          className="h-7 gap-1 rounded-full px-2 text-xs"
          disabled={claimDaily.isPending}
          onClick={() => claimDaily.mutate()}
          size="sm"
          variant="outline"
        >
          <Gift className="h-3 w-3" />
          {claimDaily.isPending ? "..." : "+5"}
        </Button>
      )}

      {/* Points display */}
      <Link
        className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 transition-colors hover:bg-muted/80"
        href="/profile"
        title="View profile & buy points"
      >
        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium text-sm">{data.points} pts</span>
      </Link>

      {/* Free skips indicator */}
      {data.freeSkipsRemaining > 0 && (
        <span
          className="rounded-full bg-muted/50 px-2 py-0.5 text-muted-foreground text-xs"
          title={`${data.freeSkipsRemaining} free skips remaining today`}
        >
          {data.freeSkipsRemaining} skips
        </span>
      )}
    </div>
  );
}
