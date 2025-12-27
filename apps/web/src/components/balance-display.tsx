"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { RewardIndicator } from "@/components/rewards/reward-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalance } from "@/hooks/use-balance";

export function BalanceDisplay() {
  const { data, isLoading, error } = useBalance();

  if (isLoading) {
    return <Skeleton className="h-8 w-20" />;
  }

  if (error || !data) {
    return null;
  }

  const balance = Number(data.available);

  return (
    <div className="flex items-center gap-2">
      <RewardIndicator />
      <Link
        className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 transition-colors hover:bg-muted/80"
        href="/deposit"
        title="Click to deposit"
      >
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">${balance.toFixed(2)}</span>
      </Link>
    </div>
  );
}
