"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeaderboard, useMyRank } from "@/hooks/use-leaderboard";
import { cn } from "@/lib/utils";

type Period = "daily" | "weekly" | "monthly" | "allTime";
type Metric = "profit" | "winRate" | "streak";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "allTime", label: "All Time" },
];

const METRICS: { value: Metric; label: string }[] = [
  { value: "profit", label: "Profit" },
  { value: "winRate", label: "Win Rate" },
  { value: "streak", label: "Streak" },
];

function formatValue(value: number, metric: Metric): string {
  switch (metric) {
    case "profit":
      return value >= 0
        ? `+$${value.toFixed(2)}`
        : `-$${Math.abs(value).toFixed(2)}`;
    case "winRate":
      return `${value.toFixed(1)}%`;
    case "streak":
      return `${value} wins`;
    default:
      throw new Error(`Unknown metric: ${metric satisfies never}`);
  }
}

function LeaderboardRow({
  rank,
  username,
  image,
  value,
  metric,
  stats,
  isCurrentUser,
}: {
  rank: number;
  username: string;
  image?: string | null;
  value: number;
  metric: Metric;
  stats: { totalBets: number; winRate: number; currentStreak: number };
  isCurrentUser?: boolean;
}) {
  const getRankStyle = (r: number) => {
    switch (r) {
      case 1:
        return "bg-amber-500/10 border-amber-500/20 text-amber-500";
      case 2:
        return "bg-slate-400/10 border-slate-400/20 text-slate-400";
      case 3:
        return "bg-orange-600/10 border-orange-600/20 text-orange-600";
      default:
        return "bg-muted";
    }
  };

  const getRankDisplay = (r: number): string => {
    switch (r) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return String(r);
    }
  };

  return (
    <Link
      className={cn(
        "flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50",
        !!isCurrentUser && "border-primary bg-primary/5"
      )}
      href={`/u/${username}`}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-bold",
          getRankStyle(rank)
        )}
      >
        {getRankDisplay(rank)}
      </div>

      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
        {image ? (
          <Image
            alt={username}
            className="object-cover"
            fill
            sizes="40px"
            src={image}
          />
        ) : (
          <span className="font-medium text-muted-foreground text-sm">
            {username[0]?.toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{username}</p>
        <p className="text-muted-foreground text-xs">
          {stats.totalBets} bets | {stats.winRate.toFixed(0)}% win rate
        </p>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "font-bold",
            metric === "profit" && value >= 0 && "text-emerald-500",
            metric === "profit" && value < 0 && "text-red-500"
          )}
        >
          {formatValue(value, metric)}
        </p>
        {stats.currentStreak > 0 && metric !== "streak" && (
          <p className="text-muted-foreground text-xs">
            🔥 {stats.currentStreak} streak
          </p>
        )}
      </div>
    </Link>
  );
}

const SKELETON_IDS_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {SKELETON_IDS_10.map((id) => (
        <div className="flex items-center gap-4 rounded-lg border p-4" key={id}>
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

type LeaderboardEntry = {
  userId: string;
  username: string | null;
  image: string | null;
  rank: number;
  value: number;
  stats: { totalBets: number; winRate: number; currentStreak: number };
};

function LeaderboardContent({
  isLoading,
  entries,
  metric,
}: {
  isLoading: boolean;
  entries: LeaderboardEntry[] | undefined;
  metric: Metric;
}) {
  if (isLoading) {
    return <LeaderboardSkeleton />;
  }

  if (!entries?.length) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No entries yet. Be the first to make a prediction!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <LeaderboardRow
          image={entry.image}
          key={entry.userId}
          metric={metric}
          rank={entry.rank}
          stats={entry.stats}
          username={entry.username ?? "Anonymous"}
          value={entry.value}
        />
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>("allTime");
  const [metric, setMetric] = useState<Metric>("profit");

  const { data, isLoading } = useLeaderboard({ period, metric, limit: 50 });
  const { data: myRank } = useMyRank({ period, metric });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Tabs
          onValueChange={(v: string) => setPeriod(v as Period)}
          value={period}
        >
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Tabs
          onValueChange={(v: string) => setMetric(v as Metric)}
          value={metric}
        >
          <TabsList>
            {METRICS.map((m) => (
              <TabsTrigger key={m.value} value={m.value}>
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Your Rank Card */}
      {myRank ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Rank</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-2xl">#{myRank.rank}</span>
              <span className="text-muted-foreground">
                {formatValue(myRank.value, metric)}
              </span>
            </div>
            <div className="text-right text-sm">
              <p>{myRank.stats.totalBets} bets</p>
              <p className="text-muted-foreground">
                {myRank.stats.winRate.toFixed(0)}% win rate
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Top Predictors</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaderboardContent
            entries={data?.entries}
            isLoading={isLoading}
            metric={metric}
          />
        </CardContent>
      </Card>
    </div>
  );
}
