"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { MarketStats } from "@/components/dashboard/market-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalance } from "@/hooks/use-balance";
import { useBetHistory } from "@/hooks/use-bet-history";
import { useLeaderboard, useMyRank } from "@/hooks/use-leaderboard";

// ═══════════════════════════════════════════════════════════════
// HERO BALANCE - The cosmic portal
// ═══════════════════════════════════════════════════════════════
function HeroBalance({
  balance,
  deposited,
  withdrawn,
  won,
  isLoading,
}: {
  balance: number;
  deposited: number;
  withdrawn: number;
  won: number;
  isLoading: boolean;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      style={{
        background: "oklch(0.10 0.03 280 / 60%)",
        backdropFilter: "blur(20px)",
        border: "1px solid oklch(0.65 0.25 290 / 20%)",
        boxShadow: `
          0 0 60px oklch(0.65 0.25 290 / 10%),
          inset 0 1px 0 oklch(1 0 0 / 8%)
        `,
      }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Cosmic background effects */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl"
        style={{ background: "oklch(0.65 0.25 290 / 15%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full blur-3xl"
        style={{ background: "oklch(0.72 0.18 175 / 10%)" }}
      />

      {/* Main balance */}
      <div className="relative mb-6">
        <div className="mb-1 flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
              boxShadow: "0 0 20px oklch(0.72 0.18 175 / 30%)",
            }}
          >
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <span
            className="font-heading font-medium text-sm"
            style={{ color: "oklch(0.65 0.04 280)" }}
          >
            Available Balance
          </span>
        </div>

        {isLoading ? (
          <Skeleton className="h-14 w-48" />
        ) : (
          <motion.div
            animate={{ scale: 1, opacity: 1 }}
            className="font-bold font-heading text-5xl tracking-tight"
            initial={{ scale: 0.9, opacity: 0 }}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.95 0.02 280), oklch(0.72 0.18 175))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 40px oklch(0.72 0.18 175 / 30%)",
            }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            $
            {balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </motion.div>
        )}
      </div>

      {/* Secondary stats */}
      <div
        className="grid grid-cols-3 gap-3 rounded-xl p-3"
        style={{
          background: "oklch(0.08 0.02 270 / 50%)",
          border: "1px solid oklch(0.65 0.25 290 / 10%)",
        }}
      >
        <SecondaryStatItem
          color="oklch(0.72 0.18 175)"
          delay={0.3}
          icon={<ArrowUpRight className="h-3.5 w-3.5" />}
          isLoading={isLoading}
          label="Deposited"
          value={deposited}
        />
        <SecondaryStatItem
          color="oklch(0.68 0.20 25)"
          delay={0.4}
          icon={<ArrowDownRight className="h-3.5 w-3.5" />}
          isLoading={isLoading}
          label="Withdrawn"
          value={withdrawn}
        />
        <SecondaryStatItem
          color="oklch(0.80 0.16 90)"
          delay={0.5}
          icon={<Sparkles className="h-3.5 w-3.5" />}
          isLoading={isLoading}
          label="Won"
          value={won}
        />
      </div>
    </motion.div>
  );
}

function SecondaryStatItem({
  icon,
  label,
  value,
  color,
  isLoading,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  isLoading: boolean;
  delay: number;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
      initial={{ opacity: 0, y: 10 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div
        className="mb-1 flex items-center justify-center gap-1"
        style={{ color }}
      >
        {icon}
        <span
          className="font-medium text-xs"
          style={{ color: "oklch(0.60 0.04 280)" }}
        >
          {label}
        </span>
      </div>
      {isLoading ? (
        <Skeleton className="mx-auto h-5 w-16" />
      ) : (
        <span
          className="font-heading font-semibold text-sm"
          style={{ color: "oklch(0.90 0.02 280)" }}
        >
          $
          {value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE CARD - Cosmic ring chart
// ═══════════════════════════════════════════════════════════════
function PerformanceCard({
  wins,
  losses,
  isLoading,
}: {
  wins: number;
  losses: number;
  isLoading: boolean;
}) {
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const winPercent = Math.round(winRate);

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
      transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <h3
        className="mb-4 flex items-center gap-2 font-heading font-medium text-sm"
        style={{ color: "oklch(0.65 0.04 280)" }}
      >
        <Zap className="h-4 w-4" style={{ color: "oklch(0.80 0.16 90)" }} />
        Performance
      </h3>

      <div className="flex items-center gap-5">
        {/* Cosmic ring chart */}
        <div className="relative">
          {isLoading ? (
            <Skeleton className="h-20 w-20 rounded-full" />
          ) : (
            <motion.div
              animate={{ scale: 1, opacity: 1 }}
              className="relative h-20 w-20"
              initial={{ scale: 0.8, opacity: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* Background ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(
                    oklch(0.72 0.18 175) 0% ${winPercent}%,
                    oklch(0.68 0.20 25 / 40%) ${winPercent}% 100%
                  )`,
                  boxShadow:
                    winPercent > 50
                      ? "0 0 25px oklch(0.72 0.18 175 / 30%)"
                      : "0 0 25px oklch(0.68 0.20 25 / 20%)",
                }}
              />
              {/* Inner circle */}
              <div
                className="absolute inset-2 flex items-center justify-center rounded-full"
                style={{
                  background: "oklch(0.10 0.03 280)",
                }}
              >
                <span
                  className="font-bold font-heading text-lg"
                  style={{
                    color:
                      winPercent >= 50
                        ? "oklch(0.72 0.18 175)"
                        : "oklch(0.68 0.20 25)",
                  }}
                >
                  {winPercent}%
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </>
          ) : (
            <>
              <div>
                <span
                  className="font-heading font-semibold text-lg"
                  style={{ color: "oklch(0.95 0.02 280)" }}
                >
                  Win Rate
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <TrendingUp
                    className="h-3.5 w-3.5"
                    style={{ color: "oklch(0.72 0.18 175)" }}
                  />
                  <span style={{ color: "oklch(0.72 0.18 175)" }}>
                    {wins} Won
                  </span>
                </span>
                <span style={{ color: "oklch(0.45 0.04 280)" }}>/</span>
                <span className="flex items-center gap-1">
                  <TrendingDown
                    className="h-3.5 w-3.5"
                    style={{ color: "oklch(0.68 0.20 25)" }}
                  />
                  <span style={{ color: "oklch(0.68 0.20 25)" }}>
                    {losses} Lost
                  </span>
                </span>
              </div>
              <div
                className="text-sm"
                style={{ color: "oklch(0.60 0.04 280)" }}
              >
                {total} Total Bets
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LEADERBOARD BADGE - Cosmic rank
// ═══════════════════════════════════════════════════════════════
function LeaderboardBadge({
  rank,
  totalUsers,
  isLoading,
}: {
  rank: number | null;
  totalUsers: number;
  isLoading: boolean;
}) {
  const percentile =
    rank && totalUsers > 0 ? ((rank / totalUsers) * 100).toFixed(1) : null;

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
      transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Trophy glow */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl"
        style={{ background: "oklch(0.80 0.16 90 / 15%)" }}
      />

      <div className="relative flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.80 0.16 90), oklch(0.70 0.18 60))",
            boxShadow: "0 0 25px oklch(0.80 0.16 90 / 30%)",
          }}
        >
          <Trophy className="h-6 w-6 text-white" />
        </div>

        <div className="flex-1">
          {isLoading && (
            <>
              <Skeleton className="mb-1 h-6 w-24" />
              <Skeleton className="h-4 w-32" />
            </>
          )}
          {!isLoading && rank && (
            <>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-bold font-heading text-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.80 0.16 90), oklch(0.95 0.02 280))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  #{rank}
                </span>
                <span
                  className="text-sm"
                  style={{ color: "oklch(0.60 0.04 280)" }}
                >
                  of {totalUsers.toLocaleString()}
                </span>
              </div>
              <div
                className="font-medium text-sm"
                style={{ color: "oklch(0.72 0.18 175)" }}
              >
                Top {percentile}%
              </div>
            </>
          )}
          {!(isLoading || rank) && (
            <div className="text-sm" style={{ color: "oklch(0.60 0.04 280)" }}>
              Place a bet to join the leaderboard
            </div>
          )}
        </div>

        <Link
          className="rounded-lg px-3 py-1.5 font-medium text-xs transition-all hover:scale-105"
          href="/leaderboard"
          style={{
            background: "oklch(0.80 0.16 90 / 15%)",
            color: "oklch(0.80 0.16 90)",
            border: "1px solid oklch(0.80 0.16 90 / 30%)",
          }}
        >
          View All
        </Link>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTIVITY FEED - Star log
// ═══════════════════════════════════════════════════════════════
const ACTIVITY_STYLES = {
  win: {
    bg: "oklch(0.72 0.18 175)",
    shadow: "0 0 8px oklch(0.72 0.18 175)",
  },
  loss: {
    bg: "oklch(0.68 0.20 25)",
    shadow: "0 0 8px oklch(0.68 0.20 25)",
  },
  bet: {
    bg: "oklch(0.65 0.25 290)",
    shadow: "0 0 8px oklch(0.65 0.25 290)",
  },
} as const;

interface ActivityItem {
  id: string;
  type: "win" | "loss" | "bet";
  title: string;
  amount: string;
  timestamp: Date;
}

function ActivityFeed({
  activities,
  isLoading,
}: {
  activities: ActivityItem[];
  isLoading: boolean;
}) {
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
      transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <h3
        className="mb-4 flex items-center gap-2 font-heading font-medium text-sm"
        style={{ color: "oklch(0.65 0.04 280)" }}
      >
        <Clock className="h-4 w-4" style={{ color: "oklch(0.65 0.25 290)" }} />
        Recent Activity
      </h3>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton className="h-12 w-full" key={i} />
          ))}
        </div>
      )}
      {!isLoading && activities.length === 0 && (
        <div
          className="py-8 text-center text-sm"
          style={{ color: "oklch(0.60 0.04 280)" }}
        >
          No recent activity. Start predicting!
        </div>
      )}
      {!isLoading && activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((activity, i) => (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 rounded-xl p-3"
              initial={{ opacity: 0, x: -10 }}
              key={activity.id}
              style={{
                background: "oklch(0.08 0.02 270 / 50%)",
                border: "1px solid oklch(0.65 0.25 290 / 8%)",
              }}
              transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
            >
              {/* Status dot */}
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  background: ACTIVITY_STYLES[activity.type].bg,
                  boxShadow: ACTIVITY_STYLES[activity.type].shadow,
                }}
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-medium text-sm"
                  style={{ color: "oklch(0.90 0.02 280)" }}
                >
                  {activity.type === "win" && "Won "}
                  {activity.type === "loss" && "Lost "}
                  {activity.type === "bet" && "Bet "}
                  <span style={{ color: ACTIVITY_STYLES[activity.type].bg }}>
                    ${activity.amount}
                  </span>
                  {" on "}
                  {activity.title}
                </p>
              </div>

              {/* Time */}
              <span
                className="shrink-0 text-xs"
                style={{ color: "oklch(0.50 0.04 280)" }}
              >
                {formatTimeAgo(activity.timestamp)}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) {
    return "now";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  if (hours < 24) {
    return `${hours}h`;
  }
  if (days < 7) {
    return `${days}d`;
  }
  return date.toLocaleDateString();
}

// ═══════════════════════════════════════════════════════════════
// ACTIVE BETS - Cosmic styled
// ═══════════════════════════════════════════════════════════════
const VOTE_STYLES = {
  YES: {
    color: "oklch(0.72 0.18 175)",
    bg: "oklch(0.72 0.18 175 / 15%)",
    border: "oklch(0.72 0.18 175 / 20%)",
  },
  NO: {
    color: "oklch(0.68 0.20 25)",
    bg: "oklch(0.68 0.20 25 / 15%)",
    border: "oklch(0.68 0.20 25 / 20%)",
  },
} as const;

interface BetWithMarket {
  bet: { id: string; vote: string; amount: string; payout: string | null };
  market: { title: string; category: string | null };
}

function ActiveBets({
  bets,
  isLoading,
}: {
  bets: BetWithMarket[] | undefined;
  isLoading: boolean;
}) {
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
      transition={{ delay: 0.45, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="flex items-center gap-2 font-heading font-medium text-sm"
          style={{ color: "oklch(0.65 0.04 280)" }}
        >
          <Sparkles
            className="h-4 w-4"
            style={{ color: "oklch(0.65 0.25 290)" }}
          />
          Active Bets
        </h3>
        <Link
          className="font-medium text-xs transition-colors"
          href="/bets"
          style={{ color: "oklch(0.72 0.18 175)" }}
        >
          View all →
        </Link>
      </div>

      {(() => {
        if (isLoading) {
          return (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton className="h-16 w-full" key={i} />
              ))}
            </div>
          );
        }
        if (!bets?.length) {
          return (
            <div
              className="py-8 text-center text-sm"
              style={{ color: "oklch(0.60 0.04 280)" }}
            >
              No active bets. Start predicting!
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {bets.map(({ bet, market }, i) => (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between rounded-xl p-3"
                initial={{ opacity: 0, x: -10 }}
                key={bet.id}
                style={{
                  background: "oklch(0.08 0.02 270 / 50%)",
                  border: `1px solid ${VOTE_STYLES[bet.vote as keyof typeof VOTE_STYLES]?.border ?? VOTE_STYLES.NO.border}`,
                }}
                transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="line-clamp-1 font-medium text-sm"
                    style={{ color: "oklch(0.90 0.02 280)" }}
                  >
                    {market.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span
                      className="font-semibold text-xs"
                      style={{
                        color:
                          VOTE_STYLES[bet.vote as keyof typeof VOTE_STYLES]
                            ?.color ?? VOTE_STYLES.NO.color,
                      }}
                    >
                      {bet.vote}
                    </span>
                    {market.category && (
                      <>
                        <span style={{ color: "oklch(0.40 0.04 280)" }}>•</span>
                        <span
                          className="text-xs"
                          style={{ color: "oklch(0.50 0.04 280)" }}
                        >
                          {market.category}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div
                  className="shrink-0 rounded-lg px-2.5 py-1 font-heading font-semibold text-sm"
                  style={{
                    background:
                      VOTE_STYLES[bet.vote as keyof typeof VOTE_STYLES]?.bg ??
                      VOTE_STYLES.NO.bg,
                    color:
                      VOTE_STYLES[bet.vote as keyof typeof VOTE_STYLES]
                        ?.color ?? VOTE_STYLES.NO.color,
                  }}
                >
                  ${bet.amount}
                </div>
              </motion.div>
            ))}
          </div>
        );
      })()}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
export default function Dashboard() {
  // Balance data
  const { data: balance, isLoading: balanceLoading } = useBalance();

  // Bet history for stats
  const { data: activeBets, isLoading: betsLoading } = useBetHistory({
    status: "ACTIVE",
    limit: 5,
  });
  const { data: wonBets, isLoading: wonLoading } = useBetHistory({
    status: "WON",
    limit: 100,
  });
  const { data: lostBets, isLoading: lostLoading } = useBetHistory({
    status: "LOST",
    limit: 100,
  });

  // Leaderboard data
  const { data: myRank, isLoading: rankLoading } = useMyRank();
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard({
    limit: 1,
  });

  // Calculate values
  const availableBalance = Number(balance?.available ?? 0);
  const totalDeposited = Number(balance?.totalDeposited ?? 0);
  const totalWithdrawn = Number(balance?.totalWithdrawn ?? 0);
  const totalWon =
    wonBets?.bets?.reduce((sum, b) => sum + Number(b.bet.payout ?? 0), 0) ?? 0;

  const wins = wonBets?.bets?.length ?? 0;
  const losses = lostBets?.bets?.length ?? 0;

  // Build activity feed from recent bets
  const recentActivities: ActivityItem[] = [
    ...(wonBets?.bets?.slice(0, 3).map((b) => ({
      id: `win-${b.bet.id}`,
      type: "win" as const,
      title: b.market.title,
      amount: b.bet.payout ?? b.bet.amount,
      timestamp: new Date(), // Ideally would come from API
    })) ?? []),
    ...(lostBets?.bets?.slice(0, 2).map((b) => ({
      id: `loss-${b.bet.id}`,
      type: "loss" as const,
      title: b.market.title,
      amount: b.bet.amount,
      timestamp: new Date(),
    })) ?? []),
  ].slice(0, 5);

  // Get total users from leaderboard
  const totalUsers =
    (leaderboard as { totalCount?: number } | undefined)?.totalCount ?? 0;

  return (
    <div className="container mx-auto space-y-4 p-4 pb-8">
      {/* Hero Balance */}
      <HeroBalance
        balance={availableBalance}
        deposited={totalDeposited}
        isLoading={balanceLoading || wonLoading}
        withdrawn={totalWithdrawn}
        won={totalWon}
      />

      {/* Two column layout on larger screens */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Performance Card */}
        <PerformanceCard
          isLoading={wonLoading || lostLoading}
          losses={losses}
          wins={wins}
        />

        {/* Leaderboard Badge */}
        <LeaderboardBadge
          isLoading={rankLoading || leaderboardLoading}
          rank={(myRank as { rank?: number } | undefined)?.rank ?? null}
          totalUsers={totalUsers}
        />
      </div>

      {/* Two column layout on larger screens */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Activity Feed */}
        <ActivityFeed
          activities={recentActivities}
          isLoading={wonLoading || lostLoading}
        />

        {/* Active Bets */}
        <ActiveBets bets={activeBets?.bets} isLoading={betsLoading} />
      </div>

      {/* Market Resolution Stats */}
      <MarketStats />
    </div>
  );
}
