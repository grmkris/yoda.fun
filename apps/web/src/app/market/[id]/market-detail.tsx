"use client";

import type { MarketId } from "@yoda.fun/shared/typeid";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Copy,
  Share2,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Countdown } from "@/components/countdown";
import { UserBetStatus } from "@/components/market/user-bet-status";
import { ResolutionDetails } from "@/components/resolution/resolution-details";
import { ResolutionMethodPreview } from "@/components/resolution/resolution-method-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarket } from "@/hooks/use-market";
import { usePlaceBet } from "@/hooks/use-place-bet";
import { authClient } from "@/lib/auth-client";
import type {
  MarketResolutionSources,
  MarketResult,
  ResolutionConfidence,
  ResolutionReasoning,
} from "@/lib/orpc-types";

interface MarketDetailProps {
  marketId: MarketId;
}

const COLORS = {
  yes: "oklch(0.72 0.18 175)",
  yesBg: "oklch(0.72 0.18 175 / 15%)",
  yesGlow: "0 0 25px oklch(0.72 0.18 175 / 50%)",
  no: "oklch(0.68 0.20 25)",
  noBg: "oklch(0.68 0.20 25 / 15%)",
  noGlow: "0 0 25px oklch(0.68 0.20 25 / 50%)",
  primary: "oklch(0.65 0.25 290)",
  primaryBg: "oklch(0.65 0.25 290 / 15%)",
  primaryGlow: "0 0 20px oklch(0.65 0.25 290 / 40%)",
  text: "oklch(0.95 0.02 280)",
  textMuted: "oklch(0.60 0.04 280)",
  textDim: "oklch(0.45 0.04 280)",
  cardBg: "oklch(0.10 0.03 280 / 60%)",
  border: "oklch(0.65 0.25 290 / 15%)",
} as const;

function OddsBarSegment({
  percent,
  direction,
  isLeading,
}: {
  percent: number;
  direction: "YES" | "NO";
  isLeading: boolean;
}) {
  const isYes = direction === "YES";
  const glow = isYes ? COLORS.yesGlow : COLORS.noGlow;
  const gradient = isYes
    ? `linear-gradient(90deg, ${COLORS.yes} 0%, oklch(0.65 0.20 180) 100%)`
    : `linear-gradient(270deg, ${COLORS.no} 0%, oklch(0.60 0.22 30) 100%)`;
  const Icon = isYes ? ThumbsUp : ThumbsDown;

  return (
    <motion.div
      animate={{ width: `${percent}%` }}
      className={`absolute top-0 ${isYes ? "left-0" : "right-0"} flex h-full items-center justify-center`}
      initial={{ width: 0 }}
      style={{
        background: gradient,
        boxShadow: isLeading ? glow : "none",
      }}
      transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
    >
      {percent >= 15 && (
        <motion.span
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 font-bold font-heading text-white"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.8 }}
        >
          {isYes ? <Icon className="h-5 w-5" /> : null}
          {percent}%{isYes ? null : <Icon className="h-5 w-5" />}
        </motion.span>
      )}
    </motion.div>
  );
}

function PulsingGlow({ leadingVote }: { leadingVote: "YES" | "NO" }) {
  const isYes = leadingVote === "YES";
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      className="pointer-events-none absolute inset-0"
      style={{
        background: isYes
          ? `linear-gradient(90deg, ${COLORS.yes}30 0%, transparent 50%)`
          : `linear-gradient(270deg, ${COLORS.no}30 0%, transparent 50%)`,
      }}
      transition={{
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

function MarketNotFound() {
  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
        href="/"
        style={{ color: COLORS.primary }}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="font-heading text-sm">Back to Markets</span>
      </Link>

      <div
        className="rounded-2xl p-12 text-center"
        style={{
          background: COLORS.cardBg,
          backdropFilter: "blur(20px)",
          border: `1px solid ${COLORS.no}30`,
        }}
      >
        <p className="font-heading text-lg" style={{ color: COLORS.no }}>
          Market not found
        </p>
        <p className="mt-2 text-sm" style={{ color: COLORS.textMuted }}>
          This market may not exist or has been removed.
        </p>
      </div>
    </div>
  );
}

function MarketHeroImage({
  imageUrl,
  title,
  status,
  isLive,
}: {
  imageUrl: string;
  title: string;
  status: string;
  isLive: boolean;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative h-48 w-full overflow-hidden rounded-2xl"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Image
        alt={title}
        className="object-cover"
        fill
        priority
        sizes="(max-width: 768px) 100vw, 800px"
        src={imageUrl}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, oklch(0.08 0.02 270) 0%, oklch(0.08 0.02 270 / 40%) 40%, transparent 70%)",
        }}
      />

      <div className="absolute top-4 right-4">
        <span
          className="rounded-full px-3 py-1.5 font-heading font-medium text-sm backdrop-blur-md"
          style={{
            background: isLive ? COLORS.yesBg : COLORS.primaryBg,
            color: isLive ? COLORS.yes : COLORS.primary,
            boxShadow: isLive ? COLORS.yesGlow : COLORS.primaryGlow,
          }}
        >
          {status}
        </span>
      </div>
    </motion.div>
  );
}

function ResolutionSection({
  result,
  confidence,
  sources,
  reasoning,
}: {
  result: MarketResult;
  confidence: ResolutionConfidence;
  sources: MarketResolutionSources;
  reasoning: ResolutionReasoning;
}) {
  return (
    <ResolutionDetails
      confidence={confidence}
      reasoning={reasoning}
      result={result}
      sources={sources}
    />
  );
}

function CountdownSection({
  votingEndsAt,
  resolutionDeadline,
}: {
  votingEndsAt: Date;
  resolutionDeadline: Date;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-4 md:grid-cols-2"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <div
        className="rounded-xl p-4"
        style={{
          background: COLORS.cardBg,
          backdropFilter: "blur(20px)",
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: COLORS.primary }} />
          <span
            className="font-heading text-xs uppercase tracking-wider"
            style={{ color: COLORS.textMuted }}
          >
            Voting Ends
          </span>
        </div>
        <Countdown targetDate={votingEndsAt} variant="full" />
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          background: COLORS.cardBg,
          backdropFilter: "blur(20px)",
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4" style={{ color: COLORS.primary }} />
          <span
            className="font-heading text-xs uppercase tracking-wider"
            style={{ color: COLORS.textMuted }}
          >
            Resolution
          </span>
        </div>
        <Countdown targetDate={resolutionDeadline} variant="full" />
      </div>
    </motion.div>
  );
}

function BettingSection({
  isLive,
  userBet,
  market,
  placeBet,
  onBet,
}: {
  isLive: boolean;
  userBet: NonNullable<ReturnType<typeof useMarket>["data"]>["userBet"];
  market: {
    totalYesVotes: number;
    totalNoVotes: number;
    totalPool: string;
    betAmount: string;
  };
  placeBet: ReturnType<typeof usePlaceBet>;
  onBet: (vote: "YES" | "NO") => void;
}) {
  if (!isLive) {
    return null;
  }

  if (userBet) {
    return (
      <UserBetStatus
        bet={userBet}
        market={{
          totalYesVotes: market.totalYesVotes,
          totalNoVotes: market.totalNoVotes,
          totalPool: market.totalPool,
        }}
      />
    );
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      style={{
        background:
          "linear-gradient(135deg, oklch(0.12 0.04 290 / 80%), oklch(0.10 0.03 280 / 60%))",
        backdropFilter: "blur(20px)",
        border: `1px solid ${COLORS.border}`,
      }}
      transition={{ duration: 0.4, delay: 0.6 }}
    >
      <h2
        className="mb-4 text-center font-heading font-medium"
        style={{ color: COLORS.text }}
      >
        Place Your Prediction
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <motion.button
          className="flex flex-col items-center gap-2 rounded-xl p-4 font-bold font-heading transition-all"
          disabled={placeBet.isPending}
          onClick={() => onBet("YES")}
          style={{
            background: COLORS.yesBg,
            border: `2px solid ${COLORS.yes}`,
            color: COLORS.yes,
          }}
          type="button"
          whileHover={{
            scale: 1.02,
            boxShadow: COLORS.yesGlow,
          }}
          whileTap={{ scale: 0.98 }}
        >
          <ThumbsUp className="h-8 w-8" />
          <span className="text-lg">YES</span>
          <span className="text-xs opacity-70">
            ${Number(market.betAmount).toFixed(2)}
          </span>
        </motion.button>

        <motion.button
          className="flex flex-col items-center gap-2 rounded-xl p-4 font-bold font-heading transition-all"
          disabled={placeBet.isPending}
          onClick={() => onBet("NO")}
          style={{
            background: COLORS.noBg,
            border: `2px solid ${COLORS.no}`,
            color: COLORS.no,
          }}
          type="button"
          whileHover={{
            scale: 1.02,
            boxShadow: COLORS.noGlow,
          }}
          whileTap={{ scale: 0.98 }}
        >
          <ThumbsDown className="h-8 w-8" />
          <span className="text-lg">NO</span>
          <span className="text-xs opacity-70">
            ${Number(market.betAmount).toFixed(2)}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}

export function MarketDetail({ marketId }: MarketDetailProps) {
  const { data: session } = authClient.useSession();
  const { data: market, isLoading, error, refetch } = useMarket(marketId);
  const placeBet = usePlaceBet();
  const [copied, setCopied] = useState(false);

  // SSR returns userBet as null, refetch to get it for authenticated users
  useEffect(() => {
    if (session?.user && market && !market.userBet) {
      refetch();
    }
  }, [session?.user, market, refetch]);

  const handleShare = async () => {
    const url = `${window.location.origin}/market/${marketId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBet = (vote: "YES" | "NO") => {
    placeBet.mutate({ marketId, vote });
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !market) {
    return <MarketNotFound />;
  }

  const totalVotes = market.totalYesVotes + market.totalNoVotes;
  const yesPercent =
    totalVotes > 0 ? Math.round((market.totalYesVotes / totalVotes) * 100) : 50;
  const noPercent = 100 - yesPercent;
  const isLive = market.status === "LIVE";
  const isResolved = market.status === "SETTLED";
  const leadingVote = yesPercent >= noPercent ? "YES" : "NO";

  return (
    <div className="space-y-6">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        initial={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
          href="/"
          style={{ color: COLORS.primary }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-heading text-sm">Back to Markets</span>
        </Link>
      </motion.div>

      {market.imageUrl && (
        <MarketHeroImage
          imageUrl={market.imageUrl}
          isLive={isLive}
          status={market.status}
          title={market.title}
        />
      )}

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {market.category && (
            <span
              className="rounded-full px-3 py-1 font-medium text-xs uppercase tracking-wider"
              style={{
                background: COLORS.primaryBg,
                color: COLORS.primary,
              }}
            >
              {market.category}
            </span>
          )}
          <button
            className="ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5 font-heading text-sm transition-all hover:scale-105"
            onClick={handleShare}
            style={{
              background: COLORS.cardBg,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted,
            }}
            type="button"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1"
                  exit={{ scale: 0.8 }}
                  initial={{ scale: 0.8 }}
                  key="copied"
                  style={{ color: COLORS.yes }}
                >
                  <Check className="h-4 w-4" />
                  Copied!
                </motion.span>
              ) : (
                <motion.span
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1"
                  exit={{ scale: 0.8 }}
                  initial={{ scale: 0.8 }}
                  key="share"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <h1
          className="font-heading font-semibold text-2xl leading-tight md:text-3xl"
          style={{ color: COLORS.text }}
        >
          {market.title}
        </h1>

        {market.description && (
          <p
            className="text-sm leading-relaxed"
            style={{ color: COLORS.textMuted }}
          >
            {market.description}
          </p>
        )}
      </motion.div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        style={{
          background: COLORS.cardBg,
          backdropFilter: "blur(20px)",
          border: `1px solid ${COLORS.border}`,
        }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="font-heading font-medium text-sm uppercase tracking-wider"
            style={{ color: COLORS.textMuted }}
          >
            Current Odds
          </h2>
          <span className="text-sm" style={{ color: COLORS.textDim }}>
            {totalVotes} total bets
          </span>
        </div>

        <div className="relative h-14 overflow-hidden rounded-xl">
          <OddsBarSegment
            direction="YES"
            isLeading={leadingVote === "YES"}
            percent={yesPercent}
          />
          <OddsBarSegment
            direction="NO"
            isLeading={leadingVote === "NO"}
            percent={noPercent}
          />
          <PulsingGlow leadingVote={leadingVote} />
        </div>

        <div className="mt-3 flex justify-between text-sm">
          <span style={{ color: COLORS.yes }}>
            YES · {market.totalYesVotes} bets
          </span>
          <span style={{ color: COLORS.no }}>
            {market.totalNoVotes} bets · NO
          </span>
        </div>
      </motion.div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 md:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div
          className="rounded-xl p-4"
          style={{
            background: COLORS.cardBg,
            backdropFilter: "blur(20px)",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: COLORS.primaryBg }}
            >
              <Wallet className="h-5 w-5" style={{ color: COLORS.primary }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: COLORS.textDim }}>
                Total Pool
              </p>
              <p
                className="font-bold font-heading text-xl"
                style={{ color: COLORS.text }}
              >
                ${Number(market.totalPool).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{
            background: COLORS.cardBg,
            backdropFilter: "blur(20px)",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: COLORS.yesBg }}
            >
              <TrendingUp className="h-5 w-5" style={{ color: COLORS.yes }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: COLORS.textDim }}>
                Bet Amount
              </p>
              <p
                className="font-bold font-heading text-xl"
                style={{ color: COLORS.text }}
              >
                ${Number(market.betAmount).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{
            background: COLORS.cardBg,
            backdropFilter: "blur(20px)",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: "oklch(0.55 0.18 200 / 15%)" }}
            >
              <Users
                className="h-5 w-5"
                style={{ color: "oklch(0.6 0.15 200)" }}
              />
            </div>
            <div>
              <p className="text-xs" style={{ color: COLORS.textDim }}>
                Participants
              </p>
              <p
                className="font-bold font-heading text-xl"
                style={{ color: COLORS.text }}
              >
                {totalVotes}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {isLive && market.votingEndsAt && market.resolutionDeadline && (
        <CountdownSection
          resolutionDeadline={market.resolutionDeadline}
          votingEndsAt={market.votingEndsAt}
        />
      )}

      {isLive && (market.resolutionStrategy || market.resolutionCriteria) && (
        <ResolutionMethodPreview criteria={market.resolutionCriteria} />
      )}

      {isResolved && market.result && (
        <ResolutionSection
          confidence={market.resolutionConfidence}
          reasoning={market.resolutionReasoning}
          result={market.result}
          sources={market.resolutionSources}
        />
      )}

      <BettingSection
        isLive={isLive}
        market={market}
        onBet={handleBet}
        placeBet={placeBet}
        userBet={market.userBet}
      />

      <motion.div
        animate={{ opacity: 1 }}
        className="flex items-center justify-center gap-2 pt-4"
        initial={{ opacity: 0 }}
        transition={{ delay: 0.7 }}
      >
        <button
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs transition-all hover:opacity-80"
          onClick={() => navigator.clipboard.writeText(marketId)}
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.textDim,
          }}
          title="Copy market ID"
          type="button"
        >
          <Copy className="h-3 w-3" />
          {marketId.slice(0, 20)}...
        </button>
      </motion.div>
    </div>
  );
}
