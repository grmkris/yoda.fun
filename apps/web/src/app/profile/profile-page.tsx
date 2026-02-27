"use client";

import { AppKitButton } from "@reown/appkit/react";
import {
  Check,
  LogOut,
  Pencil,
  TrendingDown,
  TrendingUp,
  Trophy,
  Upload,
  User,
  Wallet,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatUnits } from "viem";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBetHistory } from "@/hooks/use-bet-history";
import { useMyRank } from "@/hooks/use-leaderboard";
import { useMishaBalance } from "@/hooks/use-misha-balance";
import { useUploadAvatar } from "@/hooks/use-profile";
import { useIsAuthenticated } from "@/hooks/use-wallet";
import { authClient, type SessionWithWallet } from "@/lib/auth-client";

const COLORS = {
  teal: "oklch(0.72 0.18 175)",
  purple: "oklch(0.65 0.25 290)",
  orange: "oklch(0.68 0.20 25)",
  yellow: "oklch(0.80 0.16 90)",
  text: "oklch(0.95 0.02 280)",
  muted: "oklch(0.60 0.04 280)",
  card: "oklch(0.10 0.03 280 / 60%)",
  cardBorder: "oklch(0.65 0.25 290 / 20%)",
  innerCard: "oklch(0.08 0.02 270 / 50%)",
};

export function ProfilePage() {
  const { isPending: sessionPending } = authClient.useSession();

  if (sessionPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: COLORS.purple, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="container mx-auto max-w-2xl space-y-5 p-4 pb-8"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader />
      <ProfileCard />
      <StatsRow />
      <RecentActivity />
    </motion.div>
  );
}

function PageHeader() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { mutateAsync: disconnect } = useDisconnect();
  const { isAuthenticated } = useIsAuthenticated();

  return (
    <div className="flex items-center justify-between">
      <h1
        className="font-bold font-heading text-xl"
        style={{ color: COLORS.text }}
      >
        Profile
      </h1>
      <div className="flex items-center gap-2">
        <AppKitButton />
        {isAuthenticated && session?.user && (
          <button
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 transition-all hover:opacity-80"
            onClick={async () => {
              await disconnect();
              await authClient.signOut({
                fetchOptions: { onSuccess: () => router.push("/") },
              });
            }}
            style={{
              background: `${COLORS.orange}15`,
              color: COLORS.orange,
              border: `1px solid ${COLORS.orange}30`,
            }}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden text-sm sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}

function ProfileCard() {
  const { data: session } = authClient.useSession() as {
    data: SessionWithWallet | null;
  };
  const { isAuthenticated } = useIsAuthenticated();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
      uploadAvatar.mutate(base64, { onSuccess: () => setIsEditing(false) });
    };
    reader.readAsDataURL(file);
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

  if (!isAuthenticated) {
    return (
      <div
        className="flex items-center gap-4 rounded-2xl p-5"
        style={{
          background: COLORS.card,
          backdropFilter: "blur(20px)",
          border: `1px solid ${COLORS.cardBorder}`,
        }}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
          style={{ background: COLORS.innerCard }}
        >
          <User className="h-6 w-6" style={{ color: COLORS.muted }} />
        </div>
        <div className="flex-1">
          <p className="font-medium" style={{ color: COLORS.text }}>
            Connect your wallet
          </p>
          <p className="text-sm" style={{ color: COLORS.muted }}>
            to view your profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: COLORS.card,
        backdropFilter: "blur(20px)",
        border: `1px solid ${COLORS.cardBorder}`,
      }}
    >
      <div className="flex items-center gap-4">
        <input
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          ref={fileInputRef}
          type="file"
        />
        <button
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full transition-all"
          disabled={!isEditing || uploadAvatar.isPending}
          onClick={() => isEditing && fileInputRef.current?.click()}
          style={{
            background: session?.user?.image
              ? undefined
              : `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.purple})`,
            boxShadow: `0 0 20px ${COLORS.purple}30`,
            cursor: isEditing ? "pointer" : "default",
            opacity: uploadAvatar.isPending ? 0.5 : 1,
          }}
          type="button"
        >
          {session?.user?.image ? (
            <Image
              alt="Avatar"
              className="h-full w-full object-cover"
              height={56}
              src={session.user.image}
              width={56}
            />
          ) : (
            <User className="h-6 w-6 text-white" />
          )}
          {isEditing && (
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100"
              style={{ background: "oklch(0 0 0 / 50%)" }}
            >
              <Upload className="h-4 w-4 text-white" />
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <Input
              className="max-w-[200px]"
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              value={name}
            />
          ) : (
            <p
              className="truncate font-semibold text-lg"
              style={{ color: COLORS.text }}
            >
              {session?.user?.name || "User"}
            </p>
          )}
          {session?.walletAddress && (
            <p className="truncate text-sm" style={{ color: COLORS.muted }}>
              {session.walletAddress.slice(0, 6)}...
              {session.walletAddress.slice(-4)}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          {isEditing ? (
            <>
              <Button
                disabled={isSaving}
                onClick={saveChanges}
                size="sm"
                style={{ background: COLORS.teal, color: "white" }}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <button
              className="flex h-9 items-center gap-1.5 rounded-lg px-3 transition-all hover:opacity-80"
              onClick={() => {
                setName(session?.user?.name ?? "");
                setIsEditing(true);
              }}
              style={{
                background: `${COLORS.purple}15`,
                color: COLORS.teal,
                border: `1px solid ${COLORS.purple}30`,
              }}
              type="button"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden text-sm sm:inline">Edit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsRow() {
  const { isAuthenticated } = useIsAuthenticated();
  const { data: mishaBalance, isLoading: balanceLoading } = useMishaBalance();
  const { data: wonBets, isLoading: wonLoading } = useBetHistory({
    status: "WON",
    limit: 100,
  });
  const { data: lostBets, isLoading: lostLoading } = useBetHistory({
    status: "LOST",
    limit: 100,
  });
  const { data: myRank, isLoading: rankLoading } = useMyRank();

  const wins = wonBets?.bets?.length ?? 0;
  const losses = lostBets?.bets?.length ?? 0;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const isLoading = balanceLoading || wonLoading || lostLoading || rankLoading;

  const formattedBalance =
    mishaBalance != null
      ? Number(formatUnits(mishaBalance, 18)).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })
      : "0";

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatPill
        color={COLORS.teal}
        icon={<Wallet className="h-4 w-4" />}
        isLoading={isLoading}
        label="MISHA"
        value={isAuthenticated ? formattedBalance : "—"}
      />
      <StatPill
        color={winRate >= 50 ? COLORS.teal : COLORS.orange}
        icon={
          winRate >= 50 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )
        }
        isLoading={isLoading}
        label="Win Rate"
        secondary={isAuthenticated ? `${wins}W / ${losses}L` : undefined}
        value={isAuthenticated ? `${winRate}%` : "—"}
      />
      <StatPill
        color={COLORS.yellow}
        icon={<Trophy className="h-4 w-4" />}
        isLoading={isLoading}
        label="Rank"
        value={isAuthenticated && myRank?.rank ? `#${myRank.rank}` : "—"}
      />
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  secondary,
  color,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  secondary?: string;
  color: string;
  isLoading: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        background: COLORS.card,
        backdropFilter: "blur(20px)",
        border: `1px solid ${COLORS.cardBorder}`,
      }}
    >
      <div
        className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: `${color}20`, color }}
      >
        {icon}
      </div>
      {isLoading ? (
        <Skeleton className="mx-auto mb-1 h-6 w-16" />
      ) : (
        <p className="font-bold font-heading text-lg" style={{ color }}>
          {value}
        </p>
      )}
      <p className="text-xs" style={{ color: COLORS.muted }}>
        {label}
      </p>
      {secondary && (
        <p className="mt-1 text-xs" style={{ color: COLORS.muted }}>
          {secondary}
        </p>
      )}
    </div>
  );
}

function RecentActivity() {
  const { isAuthenticated } = useIsAuthenticated();
  const { data: activeBets, isLoading: activeLoading } = useBetHistory({
    status: "ACTIVE",
    limit: 5,
  });
  const { data: wonBets, isLoading: wonLoading } = useBetHistory({
    status: "WON",
    limit: 5,
  });
  const { data: lostBets, isLoading: lostLoading } = useBetHistory({
    status: "LOST",
    limit: 5,
  });

  const isLoading = activeLoading || wonLoading || lostLoading;

  interface Activity {
    id: string;
    type: "active" | "won" | "lost";
    title: string;
  }

  const activities: Activity[] = [
    ...(activeBets?.bets?.map((b) => ({
      id: `active-${b.bet.id}`,
      type: "active" as const,
      title: b.market.title,
    })) ?? []),
    ...(wonBets?.bets?.map((b) => ({
      id: `won-${b.bet.id}`,
      type: "won" as const,
      title: b.market.title,
    })) ?? []),
    ...(lostBets?.bets?.map((b) => ({
      id: `lost-${b.bet.id}`,
      type: "lost" as const,
      title: b.market.title,
    })) ?? []),
  ].slice(0, 6);

  const typeStyles = {
    active: { color: COLORS.purple, label: "ACTIVE" },
    won: { color: COLORS.teal, label: "WON" },
    lost: { color: COLORS.orange, label: "LOST" },
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: COLORS.card,
        backdropFilter: "blur(20px)",
        border: `1px solid ${COLORS.cardBorder}`,
      }}
    >
      <h2
        className="mb-4 font-heading font-semibold"
        style={{ color: COLORS.text }}
      >
        Recent Activity
      </h2>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton className="h-14 w-full rounded-xl" key={i} />
          ))}
        </div>
      )}

      {!isLoading && activities.length === 0 && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: COLORS.innerCard }}
        >
          <p className="text-sm" style={{ color: COLORS.muted }}>
            No bets yet. Start predicting!
          </p>
        </div>
      )}

      {!isLoading && activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((activity) => {
            const style = typeStyles[activity.type];
            return (
              <div
                className="flex items-center gap-3 rounded-xl p-3"
                key={activity.id}
                style={{
                  background: COLORS.innerCard,
                  borderLeft: `3px solid ${style.color}`,
                }}
              >
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: style.color }}
                />
                <p
                  className="min-w-0 flex-1 truncate text-sm"
                  style={{ color: COLORS.text }}
                >
                  {activity.title}
                </p>
                <span
                  className="shrink-0 rounded px-2 py-0.5 font-medium text-xs"
                  style={{
                    background: `${style.color}20`,
                    color: style.color,
                  }}
                >
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
