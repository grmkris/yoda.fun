"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { ResolutionDetails } from "@/components/resolution/resolution-details";
import { Skeleton } from "@/components/ui/skeleton";
import { useBetHistory } from "@/hooks/use-bet-history";
import type { BetStatus } from "@/lib/orpc-types";

const STATUS_FILTERS: { label: string; value: BetStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Active", value: "ACTIVE" },
  { label: "Won", value: "WON" },
  { label: "Lost", value: "LOST" },
  { label: "Refunded", value: "REFUNDED" },
];

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; glow: string }
> = {
  ACTIVE: {
    bg: "oklch(0.65 0.25 290 / 15%)",
    text: "oklch(0.65 0.25 290)",
    glow: "0 0 10px oklch(0.65 0.25 290 / 30%)",
  },
  WON: {
    bg: "oklch(0.72 0.18 175 / 15%)",
    text: "oklch(0.72 0.18 175)",
    glow: "0 0 10px oklch(0.72 0.18 175 / 30%)",
  },
  LOST: {
    bg: "oklch(0.68 0.20 25 / 15%)",
    text: "oklch(0.68 0.20 25)",
    glow: "0 0 10px oklch(0.68 0.20 25 / 30%)",
  },
  REFUNDED: {
    bg: "oklch(0.80 0.16 90 / 15%)",
    text: "oklch(0.80 0.16 90)",
    glow: "0 0 10px oklch(0.80 0.16 90 / 30%)",
  },
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BetsHistory() {
  const [statusFilter, setStatusFilter] = useState<BetStatus | undefined>(
    undefined
  );
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = useBetHistory({
    status: statusFilter,
    limit,
    offset: page * limit,
  });

  const bets = data?.bets ?? [];
  const hasMore = bets.length === limit;
  const hasPrevious = page > 0;

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div
        className="flex flex-wrap gap-2 rounded-xl p-2"
        style={{
          background: "oklch(0.10 0.03 280 / 40%)",
          border: "1px solid oklch(0.65 0.25 290 / 10%)",
        }}
      >
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          const colors = filter.value ? STATUS_COLORS[filter.value] : null;

          return (
            <button
              className="rounded-lg px-4 py-2 font-heading font-medium text-sm transition-all"
              key={filter.label}
              onClick={() => {
                setStatusFilter(filter.value);
                setPage(0);
              }}
              style={{
                background: isActive
                  ? (colors?.bg ?? "oklch(0.65 0.25 290 / 15%)")
                  : "transparent",
                color: isActive
                  ? (colors?.text ?? "oklch(0.95 0.02 280)")
                  : "oklch(0.60 0.04 280)",
                boxShadow: isActive ? (colors?.glow ?? "none") : "none",
              }}
              type="button"
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton className="h-24 w-full rounded-xl" key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: "oklch(0.10 0.03 280 / 60%)",
            backdropFilter: "blur(20px)",
            border: "1px solid oklch(0.68 0.20 25 / 20%)",
          }}
        >
          <p style={{ color: "oklch(0.68 0.20 25)" }}>Failed to load bets</p>
        </div>
      )}

      {/* Empty State */}
      {!(isLoading || error) && bets.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: "oklch(0.10 0.03 280 / 60%)",
            backdropFilter: "blur(20px)",
            border: "1px solid oklch(0.65 0.25 290 / 20%)",
          }}
        >
          <p style={{ color: "oklch(0.60 0.04 280)" }}>
            {statusFilter
              ? `No ${statusFilter.toLowerCase()} bets found`
              : "No bets yet. Start predicting!"}
          </p>
        </div>
      )}

      {/* Bets List */}
      {!(isLoading || error) && bets.length > 0 && (
        <div className="space-y-3">
          {bets.map(({ bet, market }, index) => {
            const colors = STATUS_COLORS[bet.status] ?? STATUS_COLORS.ACTIVE;
            const voteColor =
              bet.vote === "YES"
                ? "oklch(0.72 0.18 175)"
                : "oklch(0.68 0.20 25)";

            return (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-xl p-4"
                initial={{ opacity: 0, y: 10 }}
                key={bet.id}
                style={{
                  background: "oklch(0.10 0.03 280 / 60%)",
                  backdropFilter: "blur(20px)",
                  border: `1px solid ${colors.text}20`,
                }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
              >
                {/* Status indicator bar */}
                <div
                  className="absolute top-0 left-0 h-full w-1"
                  style={{ background: colors.text }}
                />

                <div className="flex items-start justify-between gap-4 pl-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Title */}
                    <h3
                      className="font-heading font-medium leading-tight"
                      style={{ color: "oklch(0.95 0.02 280)" }}
                    >
                      {market.title}
                    </h3>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status badge */}
                      <span
                        className="rounded-full px-2.5 py-0.5 font-medium text-xs"
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          boxShadow: colors.glow,
                        }}
                      >
                        {bet.status}
                      </span>

                      {/* Vote */}
                      <span
                        className="text-sm"
                        style={{ color: "oklch(0.60 0.04 280)" }}
                      >
                        Vote:{" "}
                        <span
                          className="font-semibold"
                          style={{ color: voteColor }}
                        >
                          {bet.vote}
                        </span>
                      </span>

                      {/* Category */}
                      {market.category && (
                        <>
                          <span style={{ color: "oklch(0.40 0.04 280)" }}>
                            •
                          </span>
                          <span
                            className="text-sm"
                            style={{ color: "oklch(0.50 0.04 280)" }}
                          >
                            {market.category}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Date */}
                    <p
                      className="text-xs"
                      style={{ color: "oklch(0.50 0.04 280)" }}
                    >
                      Placed on {formatDate(bet.createdAt)}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="shrink-0 text-right">
                    <p
                      className="font-bold font-heading text-lg"
                      style={{ color: "oklch(0.95 0.02 280)" }}
                    >
                      ${bet.amount}
                    </p>
                    {bet.payout && (
                      <p
                        className="font-medium text-sm"
                        style={{ color: "oklch(0.72 0.18 175)" }}
                      >
                        Won ${bet.payout}
                      </p>
                    )}
                  </div>
                </div>

                {/* Resolution details for resolved markets */}
                {market.result && (
                  <div className="mt-3 pl-3">
                    <ResolutionDetails
                      confidence={market.resolutionConfidence}
                      resolutionType={market.resolutionType}
                      result={market.result}
                      sources={market.resolutionSources}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!(isLoading || error) && (hasPrevious || hasMore) && (
        <div className="flex justify-center gap-3 pt-2">
          <button
            className="flex items-center gap-1 rounded-lg px-4 py-2 font-heading font-medium text-sm transition-all disabled:opacity-40"
            disabled={!hasPrevious}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{
              background: "oklch(0.10 0.03 280 / 60%)",
              border: "1px solid oklch(0.65 0.25 290 / 20%)",
              color: "oklch(0.80 0.04 280)",
            }}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            className="flex items-center gap-1 rounded-lg px-4 py-2 font-heading font-medium text-sm transition-all disabled:opacity-40"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            style={{
              background: "oklch(0.10 0.03 280 / 60%)",
              border: "1px solid oklch(0.65 0.25 290 / 20%)",
              color: "oklch(0.80 0.04 280)",
            }}
            type="button"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
