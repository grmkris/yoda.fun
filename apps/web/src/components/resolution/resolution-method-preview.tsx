"use client";

import type { ResolutionStrategy } from "@yoda.fun/shared/resolution-types";
import { Globe, Search } from "lucide-react";
import { motion } from "motion/react";

const COLORS = {
  oracle: "oklch(0.75 0.20 280)",
  oracleBg: "oklch(0.75 0.20 280 / 12%)",
  oracleGlow: "0 0 25px oklch(0.75 0.20 280 / 40%)",
  text: "oklch(0.95 0.02 280)",
  textMuted: "oklch(0.65 0.04 280)",
  textDim: "oklch(0.50 0.04 280)",
  cardBg: "oklch(0.12 0.03 280 / 70%)",
  border: "oklch(0.65 0.25 290 / 15%)",
} as const;

// All markets now use AI web search for resolution
const DEFAULT_METHOD = {
  icon: Globe,
  label: "AI Research",
  color: "oklch(0.70 0.22 290)",
  description: "Resolved via web search and AI analysis",
};

interface ResolutionMethodPreviewProps {
  /** @deprecated - kept for backwards compatibility */
  strategy?: ResolutionStrategy | null;
  criteria?: string | null;
  /** @deprecated - kept for backwards compatibility */
  resolutionType?: "PRICE" | "SPORTS" | "WEB_SEARCH" | null;
  className?: string;
}

/** @deprecated - Legacy strategy preview, kept for backwards compat with old markets */
function LegacyStrategyPreview({ strategy }: { strategy: ResolutionStrategy }) {
  if (strategy.type === "WEB_SEARCH") {
    return (
      <div className="flex items-start gap-2 text-sm">
        <Search
          className="mt-0.5 h-4 w-4"
          style={{ color: DEFAULT_METHOD.color }}
        />
        <div>
          <span style={{ color: COLORS.textMuted }}>Search:</span>
          <p className="mt-0.5 font-medium" style={{ color: COLORS.text }}>
            "{strategy.searchQuery}"
          </p>
        </div>
      </div>
    );
  }
  // For PRICE/SPORTS, just show a generic message
  return null;
}

export function ResolutionMethodPreview({
  strategy,
  criteria,
  className,
}: ResolutionMethodPreviewProps) {
  // All markets now use AI web search resolution
  const method = DEFAULT_METHOD;
  const MethodIcon = method.icon;

  if (!(criteria || strategy)) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      style={{
        background: COLORS.cardBg,
        backdropFilter: "blur(20px)",
        border: `1px solid ${COLORS.border}`,
        borderRadius: "1rem",
        padding: "1.25rem",
      }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <motion.div
          animate={{ scale: 1 }}
          className="rounded-xl p-2.5"
          initial={{ scale: 0 }}
          style={{ background: `${method.color}20` }}
          transition={{ delay: 0.4, type: "spring" }}
        >
          <MethodIcon className="h-5 w-5" style={{ color: method.color }} />
        </motion.div>
        <div>
          <h3
            className="font-heading font-medium text-sm"
            style={{ color: COLORS.text }}
          >
            How This Will Be Resolved
          </h3>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>
            {method.description}
          </p>
        </div>
      </div>

      {/* Resolution criteria - the primary info */}
      {criteria && (
        <motion.div
          animate={{ opacity: 1 }}
          className="rounded-lg p-3"
          initial={{ opacity: 0 }}
          style={{
            background: "oklch(0.08 0.02 270 / 50%)",
            border: `1px solid ${COLORS.border}`,
          }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>
            {criteria}
          </p>
        </motion.div>
      )}

      {/* Legacy strategy details for backwards compat */}
      {strategy && !criteria && <LegacyStrategyPreview strategy={strategy} />}
    </motion.div>
  );
}
