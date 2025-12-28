"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Clock,
  LogOut,
  Pencil,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Upload,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalance } from "@/hooks/use-balance";
import { useBetHistory } from "@/hooks/use-bet-history";
import { useLeaderboard, useMyRank } from "@/hooks/use-leaderboard";
import { useUploadAvatar } from "@/hooks/use-profile";
import { useIsAuthenticated } from "@/hooks/use-wallet";
import { authClient } from "@/lib/auth-client";
import { DepositSection } from "./deposit-section";
import { ProfileConnectPrompt } from "./profile-connect-prompt";

// ═══════════════════════════════════════════════════════════════
// PROFILE HEADER (with inline editing)
// ═══════════════════════════════════════════════════════════════
function ProfileHeader() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    setName(session?.user?.name ?? "");
    setAvatarUrl(session?.user?.image ?? "");
    setIsEditing(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        return;
      }
      const base64 = result.split(",")[1];
      // Upload starts background processing - avatar will appear via session refresh
      uploadAvatar.mutate(base64, {
        onSuccess: () => {
          setIsEditing(false);
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      if (name !== session?.user?.name) {
        await authClient.updateUser({ name });
      }
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const currentAvatarUrl = isEditing ? avatarUrl : session?.user?.image;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-5"
      initial={{ opacity: 0, y: -20 }}
      style={{
        background: "oklch(0.10 0.03 280 / 60%)",
        backdropFilter: "blur(20px)",
        border: "1px solid oklch(0.65 0.25 290 / 20%)",
      }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <input
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full transition-all"
            disabled={!isEditing || uploadAvatar.isPending}
            onClick={() => isEditing && fileInputRef.current?.click()}
            style={{
              background: currentAvatarUrl
                ? undefined
                : "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
              boxShadow: "0 0 30px oklch(0.65 0.25 290 / 30%)",
              cursor: isEditing ? "pointer" : "default",
              opacity: uploadAvatar.isPending ? 0.5 : 1,
            }}
            type="button"
          >
            {currentAvatarUrl ? (
              <Image
                alt="Avatar"
                className="h-full w-full object-cover"
                height={64}
                src={currentAvatarUrl}
                width={64}
              />
            ) : (
              <User className="h-8 w-8 text-white" />
            )}
            {isEditing && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity hover:opacity-100"
                style={{ background: "oklch(0 0 0 / 50%)" }}
              >
                <Upload className="h-5 w-5 text-white" />
              </div>
            )}
          </button>

          {/* Name & Username */}
          {isEditing ? (
            <div className="flex-1 space-y-2">
              <Input
                className="max-w-xs"
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                value={name}
              />
              <p className="text-xs" style={{ color: "oklch(0.60 0.04 280)" }}>
                Click avatar to upload image
              </p>
            </div>
          ) : (
            <div>
              <h1
                className="font-bold font-heading text-2xl"
                style={{ color: "oklch(0.95 0.02 280)" }}
              >
                {session?.user?.name || "User"}
              </h1>
              {session?.user?.name && (
                <p style={{ color: "oklch(0.65 0.04 280)" }}>
                  @{session.user.name}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {isEditing ? (
            <>
              <Button
                disabled={isSaving}
                onClick={saveChanges}
                size="sm"
                style={{
                  background: "oklch(0.72 0.18 175)",
                  color: "white",
                }}
              >
                <Check className="mr-1 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button onClick={cancelEditing} size="sm" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <button
                className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all hover:scale-105"
                onClick={startEditing}
                style={{
                  background: "oklch(0.65 0.25 290 / 15%)",
                  color: "oklch(0.72 0.18 175)",
                  border: "1px solid oklch(0.65 0.25 290 / 30%)",
                }}
                type="button"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden font-medium text-sm sm:inline">
                  Edit
                </span>
              </button>

              <button
                className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all hover:scale-105"
                onClick={() => {
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => router.push("/"),
                    },
                  });
                }}
                style={{
                  background: "oklch(0.68 0.20 25 / 15%)",
                  color: "oklch(0.68 0.20 25)",
                  border: "1px solid oklch(0.68 0.20 25 / 30%)",
                }}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden font-medium text-sm sm:inline">
                  Sign Out
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BALANCE CARD
// ═══════════════════════════════════════════════════════════════
function BalanceCard() {
  const { data: balance, isLoading } = useBalance();
  const { data: wonBets, isLoading: wonLoading } = useBetHistory({
    status: "WON",
    limit: 100,
  });

  const availableBalance = Number(balance?.available ?? 0);
  const totalDeposited = Number(balance?.totalDeposited ?? 0);
  const totalWithdrawn = Number(balance?.totalWithdrawn ?? 0);
  const totalWon =
    wonBets?.bets?.reduce((sum, b) => sum + Number(b.bet.payout ?? 0), 0) ?? 0;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      style={{
        background: "oklch(0.10 0.03 280 / 60%)",
        backdropFilter: "blur(20px)",
        border: "1px solid oklch(0.65 0.25 290 / 20%)",
        boxShadow: "0 0 60px oklch(0.65 0.25 290 / 10%)",
      }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div
        className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl"
        style={{ background: "oklch(0.65 0.25 290 / 15%)" }}
      />

      <div className="relative mb-6">
        <div className="mb-1 flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
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
          <div
            className="font-bold font-heading text-5xl tracking-tight"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.95 0.02 280), oklch(0.72 0.18 175))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            $
            {availableBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        )}
      </div>

      <div
        className="grid grid-cols-3 gap-3 rounded-xl p-3"
        style={{
          background: "oklch(0.08 0.02 270 / 50%)",
          border: "1px solid oklch(0.65 0.25 290 / 10%)",
        }}
      >
        <StatItem
          color="oklch(0.72 0.18 175)"
          icon={<ArrowUpRight className="h-3.5 w-3.5" />}
          isLoading={isLoading}
          label="Deposited"
          value={totalDeposited}
        />
        <StatItem
          color="oklch(0.68 0.20 25)"
          icon={<ArrowDownRight className="h-3.5 w-3.5" />}
          isLoading={isLoading}
          label="Withdrawn"
          value={totalWithdrawn}
        />
        <StatItem
          color="oklch(0.80 0.16 90)"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          isLoading={isLoading || wonLoading}
          label="Won"
          value={totalWon}
        />
      </div>
    </motion.div>
  );
}

function StatItem({
  icon,
  label,
  value,
  color,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  isLoading: boolean;
}) {
  return (
    <div className="text-center">
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE CARD
// ═══════════════════════════════════════════════════════════════
function PerformanceCard() {
  const { data: wonBets, isLoading: wonLoading } = useBetHistory({
    status: "WON",
    limit: 100,
  });
  const { data: lostBets, isLoading: lostLoading } = useBetHistory({
    status: "LOST",
    limit: 100,
  });

  const wins = wonBets?.bets?.length ?? 0;
  const losses = lostBets?.bets?.length ?? 0;
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const winPercent = Math.round(winRate);
  const isLoading = wonLoading || lostLoading;

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
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <h3
        className="mb-4 flex items-center gap-2 font-heading font-medium text-sm"
        style={{ color: "oklch(0.65 0.04 280)" }}
      >
        <Zap className="h-4 w-4" style={{ color: "oklch(0.80 0.16 90)" }} />
        Performance
      </h3>

      <div className="flex items-center gap-5">
        <div className="relative">
          {isLoading ? (
            <Skeleton className="h-20 w-20 rounded-full" />
          ) : (
            <div className="relative h-20 w-20">
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
              <div
                className="absolute inset-2 flex items-center justify-center rounded-full"
                style={{ background: "oklch(0.10 0.03 280)" }}
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
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
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
// LEADERBOARD BADGE
// ═══════════════════════════════════════════════════════════════
function LeaderboardBadge() {
  const { data: myRank, isLoading: rankLoading } = useMyRank();
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard({
    limit: 1,
  });

  const rank = (myRank as { rank?: number } | undefined)?.rank ?? null;
  const totalUsers =
    (leaderboard as { totalCount?: number } | undefined)?.totalCount ?? 0;
  const percentile =
    rank && totalUsers > 0 ? ((rank / totalUsers) * 100).toFixed(1) : null;
  const isLoading = rankLoading || leaderboardLoading;

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
      transition={{ delay: 0.3, duration: 0.5 }}
    >
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
// ACTIVE BETS
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

function ActiveBets() {
  const { data: activeBets, isLoading } = useBetHistory({
    status: "ACTIVE",
    limit: 5,
  });

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
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      <h3
        className="mb-4 flex items-center gap-2 font-heading font-medium text-sm"
        style={{ color: "oklch(0.65 0.04 280)" }}
      >
        <Sparkles
          className="h-4 w-4"
          style={{ color: "oklch(0.65 0.25 290)" }}
        />
        Active Bets
      </h3>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton className="h-16 w-full" key={i} />
          ))}
        </div>
      )}
      {!(isLoading || activeBets?.bets?.length) && (
        <div
          className="py-8 text-center text-sm"
          style={{ color: "oklch(0.60 0.04 280)" }}
        >
          No active bets. Start predicting!
        </div>
      )}
      {!isLoading && activeBets?.bets?.length && (
        <div className="space-y-2">
          {activeBets.bets.map(({ bet, market }) => (
            <div
              className="flex items-center justify-between rounded-xl p-3"
              key={bet.id}
              style={{
                background: "oklch(0.08 0.02 270 / 50%)",
                border: `1px solid ${VOTE_STYLES[bet.vote as keyof typeof VOTE_STYLES]?.border ?? VOTE_STYLES.NO.border}`,
              }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="line-clamp-1 font-medium text-sm"
                  style={{ color: "oklch(0.90 0.02 280)" }}
                >
                  {market.title}
                </p>
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
              </div>
              <div
                className="shrink-0 rounded-lg px-2.5 py-1 font-heading font-semibold text-sm"
                style={{
                  background:
                    VOTE_STYLES[bet.vote as keyof typeof VOTE_STYLES]?.bg ??
                    VOTE_STYLES.NO.bg,
                  color:
                    VOTE_STYLES[bet.vote as keyof typeof VOTE_STYLES]?.color ??
                    VOTE_STYLES.NO.color,
                }}
              >
                ${bet.amount}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTIVITY FEED
// ═══════════════════════════════════════════════════════════════
function ActivityFeed() {
  const { data: wonBets, isLoading: wonLoading } = useBetHistory({
    status: "WON",
    limit: 100,
  });
  const { data: lostBets, isLoading: lostLoading } = useBetHistory({
    status: "LOST",
    limit: 100,
  });

  const isLoading = wonLoading || lostLoading;

  const activities = [
    ...(wonBets?.bets?.slice(0, 3).map((b) => ({
      id: `win-${b.bet.id}`,
      type: "win" as const,
      title: b.market.title,
      amount: b.bet.payout ?? b.bet.amount,
    })) ?? []),
    ...(lostBets?.bets?.slice(0, 2).map((b) => ({
      id: `loss-${b.bet.id}`,
      type: "loss" as const,
      title: b.market.title,
      amount: b.bet.amount,
    })) ?? []),
  ].slice(0, 5);

  const activityStyles = {
    win: { bg: "oklch(0.72 0.18 175)", shadow: "0 0 8px oklch(0.72 0.18 175)" },
    loss: { bg: "oklch(0.68 0.20 25)", shadow: "0 0 8px oklch(0.68 0.20 25)" },
  };

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
      transition={{ delay: 0.5, duration: 0.5 }}
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
          {activities.map((activity) => (
            <div
              className="flex items-center gap-3 rounded-xl p-3"
              key={activity.id}
              style={{
                background: "oklch(0.08 0.02 270 / 50%)",
                border: "1px solid oklch(0.65 0.25 290 / 8%)",
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  background: activityStyles[activity.type].bg,
                  boxShadow: activityStyles[activity.type].shadow,
                }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-medium text-sm"
                  style={{ color: "oklch(0.90 0.02 280)" }}
                >
                  {activity.type === "win" && "Won "}
                  {activity.type === "loss" && "Lost "}
                  <span style={{ color: activityStyles[activity.type].bg }}>
                    ${activity.amount}
                  </span>
                  {" on "}
                  {activity.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PROFILE PAGE
// ═══════════════════════════════════════════════════════════════
export function ProfilePage() {
  const { isAnonymous, isLoading } = useIsAuthenticated();

  // Gate: anonymous users must link account to view profile
  if (isAnonymous && !isLoading) {
    return <ProfileConnectPrompt />;
  }

  return (
    <div className="container mx-auto space-y-6 p-4 pb-8">
      <ProfileHeader />

      <BalanceCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <PerformanceCard />
        <LeaderboardBadge />
      </div>

      <DepositSection />

      <div className="grid gap-4 lg:grid-cols-2">
        <ActiveBets />
        <ActivityFeed />
      </div>
    </div>
  );
}
