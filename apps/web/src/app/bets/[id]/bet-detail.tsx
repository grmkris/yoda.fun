"use client";

import type { BetId } from "@yoda.fun/shared/typeid";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { ResolutionDetails } from "@/components/resolution/resolution-details";
import { Skeleton } from "@/components/ui/skeleton";
import { useBet } from "@/hooks/use-bet";

interface BetDetailProps {
  betId: BetId;
}

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; glow: string }
> = {
  ACTIVE: {
    bg: "oklch(0.65 0.25 290 / 15%)",
    text: "oklch(0.65 0.25 290)",
    glow: "0 0 15px oklch(0.65 0.25 290 / 35%)",
  },
  WON: {
    bg: "oklch(0.72 0.18 175 / 15%)",
    text: "oklch(0.72 0.18 175)",
    glow: "0 0 15px oklch(0.72 0.18 175 / 35%)",
  },
  LOST: {
    bg: "oklch(0.68 0.20 25 / 15%)",
    text: "oklch(0.68 0.20 25)",
    glow: "0 0 15px oklch(0.68 0.20 25 / 35%)",
  },
  REFUNDED: {
    bg: "oklch(0.80 0.16 90 / 15%)",
    text: "oklch(0.80 0.16 90)",
    glow: "0 0 15px oklch(0.80 0.16 90 / 35%)",
  },
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BetDetail({ betId }: BetDetailProps) {
  const { data, isLoading, error } = useBet(betId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-24 flex-1" />
          <Skeleton className="h-24 flex-1" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link
          className="inline-flex items-center gap-2 transition-colors hover:opacity-80"
          href="/bets"
          style={{ color: "oklch(0.7 0.15 200)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-heading text-sm">Back to Bets</span>
        </Link>

        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: "oklch(0.10 0.03 280 / 60%)",
            backdropFilter: "blur(20px)",
            border: "1px solid oklch(0.68 0.20 25 / 20%)",
          }}
        >
          <p
            className="font-heading text-lg"
            style={{ color: "oklch(0.68 0.20 25)" }}
          >
            Bet not found
          </p>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.5 0.04 280)" }}>
            This bet may not exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  const { bet, market } = data;
  const colors = STATUS_COLORS[bet.status];
  const voteColor =
    bet.vote === "YES" ? "oklch(0.72 0.18 175)" : "oklch(0.68 0.20 25)";
  const isActive = bet.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        initial={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          className="inline-flex items-center gap-2 transition-colors hover:opacity-80"
          href="/bets"
          style={{ color: "oklch(0.7 0.15 200)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-heading text-sm">Back to Bets</span>
        </Link>
      </motion.div>

      {market.imageUrl && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="relative aspect-video overflow-hidden rounded-2xl"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Image
            alt={market.title}
            className="object-cover"
            fill
            priority
            src={market.imageUrl}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, oklch(0.08 0.02 270) 0%, transparent 60%)",
            }}
          />
        </motion.div>
      )}

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="rounded-full px-3 py-1 font-medium text-sm"
            style={{
              background: colors.bg,
              color: colors.text,
              boxShadow: colors.glow,
            }}
          >
            {bet.status}
          </span>
          {market.category && (
            <span className="text-sm" style={{ color: "oklch(0.5 0.04 280)" }}>
              {market.category}
            </span>
          )}
        </div>

        <h1
          className="font-heading font-semibold text-2xl leading-tight md:text-3xl"
          style={{ color: "oklch(0.95 0.02 280)" }}
        >
          {market.title}
        </h1>

        {market.description && (
          <p
            className="text-sm leading-relaxed"
            style={{ color: "oklch(0.6 0.04 280)" }}
          >
            {market.description}
          </p>
        )}
      </motion.div>

      {isActive && market.votingEndsAt && market.resolutionDeadline && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(0.10 0.03 280 / 60%)",
              backdropFilter: "blur(20px)",
              border: "1px solid oklch(0.65 0.25 290 / 15%)",
            }}
          >
            <Countdown
              label="Voting ends in"
              targetDate={market.votingEndsAt}
              variant="full"
            />
          </div>
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(0.10 0.03 280 / 60%)",
              backdropFilter: "blur(20px)",
              border: "1px solid oklch(0.65 0.25 290 / 15%)",
            }}
          >
            <Countdown
              label="Resolution deadline"
              targetDate={market.resolutionDeadline}
              variant="full"
            />
          </div>
        </motion.div>
      )}

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-5"
        initial={{ opacity: 0, y: 20 }}
        style={{
          background: "oklch(0.10 0.03 280 / 60%)",
          backdropFilter: "blur(20px)",
          border: "1px solid oklch(0.65 0.25 290 / 15%)",
        }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <h2
          className="mb-4 font-heading font-medium text-sm uppercase tracking-wider"
          style={{ color: "oklch(0.6 0.04 280)" }}
        >
          Your Prediction
        </h2>

        <div className="flex items-center gap-6">
          <div
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl"
            style={{
              background:
                bet.vote === "YES"
                  ? "oklch(0.72 0.18 175 / 15%)"
                  : "oklch(0.68 0.20 25 / 15%)",
              border: `2px solid ${voteColor}`,
              boxShadow: `0 0 20px ${voteColor}40`,
            }}
          >
            <span
              className="font-bold font-heading text-xl"
              style={{ color: voteColor }}
            >
              {bet.vote}
            </span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-baseline gap-2">
              <span
                className="text-sm"
                style={{ color: "oklch(0.5 0.04 280)" }}
              >
                Bet:
              </span>
              <span
                className="font-bold font-heading text-xl"
                style={{ color: "oklch(0.95 0.02 280)" }}
              >
                ${bet.amount}
              </span>
            </div>

            {bet.payout && (
              <div className="flex items-baseline gap-2">
                <span
                  className="text-sm"
                  style={{ color: "oklch(0.5 0.04 280)" }}
                >
                  Won:
                </span>
                <span
                  className="font-bold font-heading text-xl"
                  style={{ color: "oklch(0.72 0.18 175)" }}
                >
                  ${bet.payout}
                </span>
              </div>
            )}
            {!bet.payout && isActive && (
              <div className="flex items-baseline gap-2">
                <span
                  className="text-sm"
                  style={{ color: "oklch(0.5 0.04 280)" }}
                >
                  Potential:
                </span>
                <span
                  className="font-heading font-medium text-lg"
                  style={{ color: "oklch(0.7 0.04 280)" }}
                >
                  Awaiting resolution
                </span>
              </div>
            )}

            <p className="text-xs" style={{ color: "oklch(0.5 0.04 280)" }}>
              Placed on {formatDate(bet.createdAt)}
            </p>
          </div>
        </div>
      </motion.div>

      {market.result && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5"
          initial={{ opacity: 0, y: 20 }}
          style={{
            background: "oklch(0.10 0.03 280 / 60%)",
            backdropFilter: "blur(20px)",
            border: "1px solid oklch(0.65 0.25 290 / 15%)",
          }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <h2
            className="mb-4 font-heading font-medium text-sm uppercase tracking-wider"
            style={{ color: "oklch(0.6 0.04 280)" }}
          >
            Resolution
          </h2>
          <ResolutionDetails
            confidence={market.resolutionConfidence}
            resolutionType={market.resolutionType}
            result={market.result}
            sources={market.resolutionSources}
          />
        </motion.div>
      )}
    </div>
  );
}
