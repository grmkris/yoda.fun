"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalance } from "@/hooks/use-balance";

export function BalanceDisplay() {
  const { data, isLoading, error } = useBalance();

  if (isLoading) {
    return <Skeleton className="h-7 w-16" />;
  }

  if (error || !data) {
    return null;
  }

  const balance = Number(data.available);

  return (
    <Link
      className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 transition-colors hover:bg-muted/80"
      href="/profile"
      title="Click to deposit"
    >
      <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium text-sm">${balance.toFixed(2)}</span>
    </Link>
  );
}
