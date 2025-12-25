"use client";

import { BarChart3, CheckCircle, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { ConfidenceBar } from "@/components/resolution/confidence-bar";
import { MethodBadge } from "@/components/resolution/method-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useResolutionStats } from "@/hooks/use-resolution-stats";

const RESULT_STYLES = {
  YES: {
    bg: "oklch(0.72 0.18 175)",
    shadow: "0 0 8px oklch(0.72 0.18 175)",
  },
  NO: {
    bg: "oklch(0.68 0.20 25)",
    shadow: "0 0 8px oklch(0.68 0.20 25)",
  },
  INVALID: {
    bg: "oklch(0.80 0.16 90)",
    shadow: "0 0 8px oklch(0.80 0.16 90)",
  },
} as const;

export function MarketStats() {
  const { data, isLoading } = useResolutionStats("week");

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
      transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <h3
        className="mb-4 flex items-center gap-2 font-heading font-medium text-sm"
        style={{ color: "oklch(0.65 0.04 280)" }}
      >
        <BarChart3
          className="h-4 w-4"
          style={{ color: "oklch(0.65 0.25 290)" }}
        />
        Market Resolution Stats (This Week)
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="grid grid-cols-2 gap-3 rounded-xl p-3"
            style={{
              background: "oklch(0.08 0.02 270 / 50%)",
              border: "1px solid oklch(0.65 0.25 290 / 10%)",
            }}
          >
            <div className="text-center">
              <div
                className="mb-1 flex items-center justify-center gap-1"
                style={{ color: "oklch(0.72 0.18 175)" }}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span
                  className="font-medium text-xs"
                  style={{ color: "oklch(0.60 0.04 280)" }}
                >
                  Resolved
                </span>
              </div>
              <span
                className="font-heading font-semibold text-lg"
                style={{ color: "oklch(0.90 0.02 280)" }}
              >
                {data?.totalResolved ?? 0}
              </span>
            </div>
            <div className="text-center">
              <div
                className="mb-1 flex items-center justify-center gap-1"
                style={{ color: "oklch(0.80 0.16 90)" }}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span
                  className="font-medium text-xs"
                  style={{ color: "oklch(0.60 0.04 280)" }}
                >
                  Avg Confidence
                </span>
              </div>
              <span
                className="font-heading font-semibold text-lg"
                style={{ color: "oklch(0.90 0.02 280)" }}
              >
                {data?.avgConfidence ?? 0}%
              </span>
            </div>
          </div>

          {data?.methodBreakdown && data.methodBreakdown.length > 0 && (
            <div>
              <p
                className="mb-2 font-medium text-xs"
                style={{ color: "oklch(0.60 0.04 280)" }}
              >
                Resolution Methods
              </p>
              <div className="flex flex-wrap gap-2">
                {data.methodBreakdown.map(({ method, count }) => (
                  <div
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                    key={method}
                    style={{
                      background: "oklch(0.08 0.02 270 / 50%)",
                      border: "1px solid oklch(0.65 0.25 290 / 10%)",
                    }}
                  >
                    {method && <MethodBadge type={method} />}
                    <span
                      className="font-medium text-xs"
                      style={{ color: "oklch(0.70 0.04 280)" }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data?.recentResolutions && data.recentResolutions.length > 0 && (
            <div>
              <p
                className="mb-2 font-medium text-xs"
                style={{ color: "oklch(0.60 0.04 280)" }}
              >
                Recent Resolutions
              </p>
              <div className="space-y-2">
                {data.recentResolutions.slice(0, 3).map((market) => (
                  <div
                    className="flex items-center gap-3 rounded-xl p-2.5"
                    key={market.id}
                    style={{
                      background: "oklch(0.08 0.02 270 / 50%)",
                      border: "1px solid oklch(0.65 0.25 290 / 8%)",
                    }}
                  >
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background:
                          RESULT_STYLES[
                            market.result as keyof typeof RESULT_STYLES
                          ]?.bg ?? RESULT_STYLES.INVALID.bg,
                        boxShadow:
                          RESULT_STYLES[
                            market.result as keyof typeof RESULT_STYLES
                          ]?.shadow ?? RESULT_STYLES.INVALID.shadow,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-xs"
                        style={{ color: "oklch(0.90 0.02 280)" }}
                      >
                        {market.title}
                      </p>
                    </div>
                    {market.resolutionConfidence !== null && (
                      <div className="w-16 shrink-0">
                        <ConfidenceBar value={market.resolutionConfidence} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
