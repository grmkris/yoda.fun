"use client";

import { Calendar, Clock } from "lucide-react";
import { motion } from "motion/react";
import { Countdown } from "@/components/countdown";
import type { MarketCard } from "./card-front";

interface GameCardBackProps {
  card: MarketCard;
  onVoteYes?: () => void;
  onVoteNo?: () => void;
  /** When true, renders without card container (for use inside sheets/modals) */
  inSheet?: boolean;
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
  inSheet = false,
}: GameCardBackProps) {
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
