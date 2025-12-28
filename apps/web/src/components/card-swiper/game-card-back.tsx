"use client";

import { Clock, Coins, ExternalLink, Users, X } from "lucide-react";
import { motion } from "motion/react";
import type { MarketCard } from "./game-card";

interface GameCardBackProps {
  card: MarketCard;
  onClose?: () => void;
  onVoteYes?: () => void;
  onVoteNo?: () => void;
}

function formatDate(date: Date | string | null): string {
  if (!date) {
    return "TBD";
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPool(pool: string | number | null): string {
  if (!pool) {
    return "$0.00";
  }
  const num = typeof pool === "string" ? Number.parseFloat(pool) : pool;
  return `$${num.toFixed(2)}`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function GameCardBack({
  card,
  onClose,
  onVoteYes,
  onVoteNo,
}: GameCardBackProps) {
  const totalVotes = (card.totalYesVotes ?? 0) + (card.totalNoVotes ?? 0);
  const yesPercent =
    totalVotes > 0 ? ((card.totalYesVotes ?? 0) / totalVotes) * 100 : 50;

  return (
    <div className="relative h-full w-full">
      {/* Ethereal border glow */}
      <div
        className="absolute -inset-[1px] rounded-3xl opacity-60"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.65 0.25 290 / 50%), oklch(0.70 0.15 200 / 30%), oklch(0.65 0.25 290 / 50%))",
        }}
      />

      {/* Main card container */}
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl shadow-2xl backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.12 0.03 280 / 98%) 0%, oklch(0.08 0.02 270 / 98%) 100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-white/10 border-b p-4">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-heading text-xs"
            style={{
              background: "oklch(1 0 0 / 8%)",
              color: "oklch(0.85 0.02 280)",
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "oklch(0.70 0.15 200)" }}
            />
            {card.category ?? "Market"}
          </div>
          {onClose ? (
            <motion.button
              className="rounded-full p-2 transition-colors hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              type="button"
              whileTap={{ scale: 0.9 }}
            >
              <X
                className="h-5 w-5"
                style={{ color: "oklch(0.85 0.02 280)" }}
              />
            </motion.button>
          ) : null}
        </div>

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto p-5"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "oklch(0.4 0.02 280) transparent",
          }}
        >
          {/* Title */}
          <h3
            className="mb-4 font-bold font-heading text-xl leading-tight"
            style={{ color: "oklch(0.98 0.01 280)" }}
          >
            {card.title}
          </h3>

          {/* Full Description */}
          <p
            className="mb-6 text-sm leading-relaxed"
            style={{ color: "oklch(0.80 0.02 280)" }}
          >
            {card.description}
          </p>

          {/* Resolution Criteria */}
          {card.resolutionCriteria ? (
            <div className="mb-6">
              <h4
                className="mb-2 flex items-center gap-2 font-heading font-semibold text-xs uppercase tracking-wider"
                style={{ color: "oklch(0.65 0.15 290)" }}
              >
                Resolution Criteria
              </h4>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "oklch(0.75 0.02 280)" }}
              >
                {card.resolutionCriteria}
              </p>
            </div>
          ) : null}

          {/* Statistics */}
          <div className="mb-6">
            <h4
              className="mb-3 flex items-center gap-2 font-heading font-semibold text-xs uppercase tracking-wider"
              style={{ color: "oklch(0.65 0.15 290)" }}
            >
              <Users className="h-3.5 w-3.5" />
              Votes
            </h4>

            {/* Vote Bar */}
            <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${yesPercent}%`,
                  background:
                    "linear-gradient(90deg, oklch(0.72 0.18 175), oklch(0.65 0.16 180))",
                }}
              />
            </div>

            {/* Vote Counts */}
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: "oklch(0.72 0.18 175)" }}
                />
                <span style={{ color: "oklch(0.72 0.18 175)" }}>
                  YES {card.totalYesVotes ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: "oklch(0.70 0.20 25)" }}>
                  NO {card.totalNoVotes ?? 0}
                </span>
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: "oklch(0.70 0.20 25)" }}
                />
              </div>
            </div>
          </div>

          {/* Pool & Deadline */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div
              className="rounded-xl p-3"
              style={{
                background: "oklch(1 0 0 / 5%)",
                border: "1px solid oklch(1 0 0 / 10%)",
              }}
            >
              <div
                className="mb-1 flex items-center gap-1.5 text-xs"
                style={{ color: "oklch(0.60 0.02 280)" }}
              >
                <Coins className="h-3.5 w-3.5" />
                Total Pool
              </div>
              <div
                className="font-accent font-bold text-lg"
                style={{ color: "oklch(0.72 0.18 175)" }}
              >
                {formatPool(card.totalPool)}
              </div>
            </div>
            <div
              className="rounded-xl p-3"
              style={{
                background: "oklch(1 0 0 / 5%)",
                border: "1px solid oklch(1 0 0 / 10%)",
              }}
            >
              <div
                className="mb-1 flex items-center gap-1.5 text-xs"
                style={{ color: "oklch(0.60 0.02 280)" }}
              >
                <Clock className="h-3.5 w-3.5" />
                Ends
              </div>
              <div
                className="font-heading font-medium text-sm"
                style={{ color: "oklch(0.85 0.02 280)" }}
              >
                {formatDate(card.votingEndsAt)}
              </div>
            </div>
          </div>

          {/* Sources */}
          {card.resolutionSources && card.resolutionSources.length > 0 ? (
            <div className="mb-6">
              <h4
                className="mb-3 flex items-center gap-2 font-heading font-semibold text-xs uppercase tracking-wider"
                style={{ color: "oklch(0.65 0.15 290)" }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Sources
              </h4>
              <div className="space-y-2">
                {card.resolutionSources.map((source) => (
                  <a
                    className="block rounded-xl p-3 transition-colors hover:bg-white/5"
                    href={source.url}
                    key={source.url}
                    rel="noopener noreferrer"
                    style={{
                      background: "oklch(1 0 0 / 3%)",
                      border: "1px solid oklch(1 0 0 / 8%)",
                    }}
                    target="_blank"
                  >
                    <div
                      className="mb-1 flex items-center gap-1.5 font-medium text-sm"
                      style={{ color: "oklch(0.70 0.15 200)" }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {extractDomain(source.url)}
                    </div>
                    {source.snippet ? (
                      <p
                        className="line-clamp-2 text-xs"
                        style={{ color: "oklch(0.65 0.02 280)" }}
                      >
                        "{source.snippet}"
                      </p>
                    ) : null}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {/* Confidence */}
          {card.resolutionConfidence != null &&
          card.resolutionConfidence > 0 ? (
            <div>
              <h4
                className="mb-2 font-heading font-semibold text-xs uppercase tracking-wider"
                style={{ color: "oklch(0.65 0.15 290)" }}
              >
                AI Confidence
              </h4>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${card.resolutionConfidence}%`,
                      background:
                        "linear-gradient(90deg, oklch(0.65 0.25 290), oklch(0.70 0.15 200))",
                    }}
                  />
                </div>
                <span
                  className="font-accent font-bold text-sm"
                  style={{ color: "oklch(0.85 0.02 280)" }}
                >
                  {card.resolutionConfidence}%
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer - Vote & Close Buttons */}
        <div className="border-white/10 border-t p-4">
          <div className="flex gap-2">
            {/* NO Button */}
            <motion.button
              className="flex-1 rounded-full py-3 font-bold font-heading text-sm"
              onClick={(e) => {
                e.stopPropagation();
                onVoteNo?.();
              }}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.70 0.20 25), oklch(0.60 0.18 20))",
                color: "oklch(0.98 0.01 25)",
                boxShadow: "0 4px 20px oklch(0.70 0.20 25 / 30%)",
              }}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              NO
            </motion.button>

            {/* Close Button */}
            <motion.button
              className="flex-1 rounded-full py-3 font-heading font-medium text-sm backdrop-blur-md"
              onClick={(e) => {
                e.stopPropagation();
                onClose?.();
              }}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.25 290 / 35%), oklch(0.70 0.15 200 / 25%))",
                border: "1px solid oklch(1 0 0 / 20%)",
                color: "oklch(0.92 0.02 280)",
              }}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              Close
            </motion.button>

            {/* YES Button */}
            <motion.button
              className="flex-1 rounded-full py-3 font-bold font-heading text-sm"
              onClick={(e) => {
                e.stopPropagation();
                onVoteYes?.();
              }}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.16 180))",
                color: "oklch(0.08 0.02 175)",
                boxShadow: "0 4px 20px oklch(0.72 0.18 175 / 30%)",
              }}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              YES
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
