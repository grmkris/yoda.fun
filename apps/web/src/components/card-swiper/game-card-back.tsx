"use client";

import { Calendar, Clock, ExternalLink, Users } from "lucide-react";
import { motion } from "motion/react";
import { Countdown } from "@/components/countdown";
import type { MarketCard } from "./card-front";

interface GameCardBackProps {
  card: MarketCard;
  onVoteYes?: () => void;
  onVoteNo?: () => void;
  onSkip?: () => void;
  /** When true, renders without card container (for use inside sheets/modals) */
  inSheet?: boolean;
}

function extractDomain(url: string): string {
  return new URL(url).hostname.replace("www.", "");
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GameCardBack({
  card,
  onVoteYes,
  onVoteNo,
  onSkip,
  inSheet = false,
}: GameCardBackProps) {
  const totalVotes = (card.totalYesVotes ?? 0) + (card.totalNoVotes ?? 0);
  const yesPercent =
    totalVotes > 0 ? ((card.totalYesVotes ?? 0) / totalVotes) * 100 : 50;

  const content = (
    <>
      {/* Scrollable Content */}
      <div
        className="flex-1 p-4 pt-3"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "oklch(0.4 0.02 280) transparent",
        }}
      >
        {/* Category badge */}
        {card.category ? (
          <div
            className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-heading text-xs"
            style={{
              background: "oklch(1 0 0 / 8%)",
              color: "oklch(0.75 0.02 280)",
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "oklch(0.70 0.15 200)" }}
            />
            {card.category}
          </div>
        ) : null}

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
          <div className="mb-3 flex items-center justify-between">
            <h4
              className="flex items-center gap-2 font-heading font-semibold text-xs uppercase tracking-wider"
              style={{ color: "oklch(0.65 0.15 290)" }}
            >
              <Users className="h-3.5 w-3.5" />
              Votes
            </h4>
            <span
              className="font-accent font-bold text-sm"
              style={{ color: "oklch(0.85 0.02 280)" }}
            >
              {totalVotes} total
            </span>
          </div>

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

        {/* Countdown Timers */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3"
            style={{
              background: "oklch(1 0 0 / 5%)",
              border: "1px solid oklch(1 0 0 / 10%)",
            }}
          >
            <div
              className="mb-1.5 flex items-center gap-1.5 text-xs"
              style={{ color: "oklch(0.60 0.02 280)" }}
            >
              <Clock className="h-3.5 w-3.5" />
              Betting Ends
            </div>
            <Countdown targetDate={card.votingEndsAt} variant="compact" />
            <div
              className="mt-1 text-xs"
              style={{ color: "oklch(0.55 0.02 280)" }}
            >
              {formatDate(card.votingEndsAt)}
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
              className="mb-1.5 flex items-center gap-1.5 text-xs"
              style={{ color: "oklch(0.60 0.02 280)" }}
            >
              <Calendar className="h-3.5 w-3.5" />
              Market Ends
            </div>
            <Countdown targetDate={card.resolutionDeadline} variant="compact" />
            <div
              className="mt-1 text-xs"
              style={{ color: "oklch(0.55 0.02 280)" }}
            >
              {formatDate(card.resolutionDeadline)}
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
        {card.resolutionConfidence != null && card.resolutionConfidence > 0 ? (
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

      {/* Footer - Vote Buttons */}
      <div
        className="p-4"
        style={{ borderTop: "1px solid oklch(1 0 0 / 10%)" }}
      >
        <div className="flex items-center gap-3">
          {/* NO Button */}
          <motion.button
            className="flex-1 rounded-full py-3 font-bold font-heading text-sm"
            onClick={(e) => {
              e.stopPropagation();
              onVoteNo?.();
            }}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.68 0.22 25), oklch(0.55 0.20 20))",
              color: "oklch(0.98 0.01 25)",
              boxShadow: "0 4px 20px oklch(0.68 0.22 25 / 30%)",
            }}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            NO
          </motion.button>

          {/* Skip Button - smaller, muted */}
          <motion.button
            className="rounded-full px-5 py-2.5 font-heading font-medium text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onSkip?.();
            }}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.30 0.08 290), oklch(0.25 0.06 280))",
              border: "1px solid oklch(0.50 0.15 290 / 30%)",
              color: "oklch(0.75 0.02 280)",
            }}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Skip
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
                "linear-gradient(135deg, oklch(0.72 0.20 175), oklch(0.58 0.18 180))",
              color: "oklch(0.08 0.02 175)",
              boxShadow: "0 4px 20px oklch(0.72 0.20 175 / 30%)",
            }}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            YES
          </motion.button>
        </div>
      </div>
    </>
  );

  // When in sheet, render just the content without card wrapper
  if (inSheet) {
    return content;
  }

  // Standalone card with full styling
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
        {content}
      </div>
    </div>
  );
}
