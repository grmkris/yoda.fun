"use client";

import type { ResolutionStrategy } from "@yoda.fun/shared/resolution-types";
import {
  CheckCircle2,
  DollarSign,
  Globe,
  Search,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import type { BetMarket } from "@/lib/orpc-types";

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

const methodConfig = {
  PRICE: {
    icon: DollarSign,
    label: "Price Oracle",
    color: "oklch(0.70 0.18 200)",
    description: "Resolved automatically via price data",
  },
  SPORTS: {
    icon: Trophy,
    label: "Sports Data",
    color: "oklch(0.72 0.20 145)",
    description: "Resolved automatically via sports results",
  },
  WEB_SEARCH: {
    icon: Globe,
    label: "AI Research",
    color: "oklch(0.70 0.22 290)",
    description: "Resolved via web search and AI analysis",
  },
};

interface ResolutionMethodPreviewProps {
  strategy?: ResolutionStrategy | null;
  criteria?: string | null;
  resolutionType?: BetMarket["resolutionType"];
  className?: string;
}

function StrategyPreview({ strategy }: { strategy: ResolutionStrategy }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0 },
  };

  if (strategy.type === "PRICE") {
    const operatorLabels: Record<string, string> = {
      ">=": "reaches or exceeds",
      "<=": "drops to or below",
      ">": "exceeds",
      "<": "drops below",
    };
    return (
      <motion.div
        animate="visible"
        className="space-y-2"
        initial="hidden"
        variants={containerVariants}
      >
        <motion.div
          className="flex items-center gap-2 text-sm"
          variants={itemVariants}
        >
          <DollarSign
            className="h-4 w-4"
            style={{ color: methodConfig.PRICE.color }}
          />
          <span style={{ color: COLORS.textMuted }}>Asset:</span>
          <span className="font-medium" style={{ color: COLORS.text }}>
            {strategy.coinId.toUpperCase()}
          </span>
        </motion.div>
        <motion.div
          className="flex items-center gap-2 text-sm"
          variants={itemVariants}
        >
          <Target
            className="h-4 w-4"
            style={{ color: methodConfig.PRICE.color }}
          />
          <span style={{ color: COLORS.textMuted }}>Target:</span>
          <span className="font-medium" style={{ color: COLORS.text }}>
            {operatorLabels[strategy.operator]} $
            {strategy.threshold.toLocaleString()}
          </span>
        </motion.div>
      </motion.div>
    );
  }

  if (strategy.type === "SPORTS") {
    return (
      <motion.div
        animate="visible"
        className="space-y-2"
        initial="hidden"
        variants={containerVariants}
      >
        <motion.div
          className="flex items-center gap-2 text-sm"
          variants={itemVariants}
        >
          <Trophy
            className="h-4 w-4"
            style={{ color: methodConfig.SPORTS.color }}
          />
          <span style={{ color: COLORS.textMuted }}>Team:</span>
          <span className="font-medium" style={{ color: COLORS.text }}>
            {strategy.teamName}
          </span>
        </motion.div>
        <motion.div
          className="flex items-center gap-2 text-sm"
          variants={itemVariants}
        >
          <Zap
            className="h-4 w-4"
            style={{ color: methodConfig.SPORTS.color }}
          />
          <span style={{ color: COLORS.textMuted }}>Condition:</span>
          <span
            className="font-medium capitalize"
            style={{ color: COLORS.text }}
          >
            Must {strategy.outcome}
          </span>
        </motion.div>
      </motion.div>
    );
  }

  if (strategy.type === "WEB_SEARCH") {
    return (
      <motion.div
        animate="visible"
        className="space-y-2"
        initial="hidden"
        variants={containerVariants}
      >
        <motion.div
          className="flex items-start gap-2 text-sm"
          variants={itemVariants}
        >
          <Search
            className="mt-0.5 h-4 w-4"
            style={{ color: methodConfig.WEB_SEARCH.color }}
          />
          <div>
            <span style={{ color: COLORS.textMuted }}>Search:</span>
            <p className="mt-0.5 font-medium" style={{ color: COLORS.text }}>
              "{strategy.searchQuery}"
            </p>
          </div>
        </motion.div>
        {strategy.successIndicators.length > 0 && (
          <motion.div
            className="flex items-start gap-2 text-sm"
            variants={itemVariants}
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4"
              style={{ color: methodConfig.WEB_SEARCH.color }}
            />
            <div>
              <span style={{ color: COLORS.textMuted }}>Looking for:</span>
              <ul className="mt-1 space-y-0.5">
                {strategy.successIndicators.slice(0, 3).map((indicator, i) => (
                  <li
                    className="flex items-center gap-1.5 text-sm"
                    key={i}
                    style={{ color: COLORS.text }}
                  >
                    <span style={{ color: methodConfig.WEB_SEARCH.color }}>
                      •
                    </span>
                    {indicator}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  }

  return null;
}

export function ResolutionMethodPreview({
  strategy,
  criteria,
  resolutionType,
  className,
}: ResolutionMethodPreviewProps) {
  const method = resolutionType ? methodConfig[resolutionType] : null;
  const MethodIcon = method?.icon;

  if (!(strategy || criteria || resolutionType)) {
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
        {method && MethodIcon && (
          <motion.div
            animate={{ scale: 1 }}
            className="rounded-xl p-2.5"
            initial={{ scale: 0 }}
            style={{ background: `${method.color}20` }}
            transition={{ delay: 0.4, type: "spring" }}
          >
            <MethodIcon className="h-5 w-5" style={{ color: method.color }} />
          </motion.div>
        )}
        <div>
          <h3
            className="font-heading font-medium text-sm"
            style={{ color: COLORS.text }}
          >
            How This Will Be Resolved
          </h3>
          {method && (
            <p className="text-xs" style={{ color: COLORS.textMuted }}>
              {method.description}
            </p>
          )}
        </div>
      </div>

      {/* Criteria text */}
      {criteria && (
        <motion.div
          animate={{ opacity: 1 }}
          className="mb-4 rounded-lg p-3"
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

      {/* Strategy details */}
      {strategy && <StrategyPreview strategy={strategy} />}
    </motion.div>
  );
}
