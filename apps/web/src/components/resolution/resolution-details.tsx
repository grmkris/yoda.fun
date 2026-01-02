"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  XCircle,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import type { BetMarket, MarketResult } from "@/lib/orpc-types";

const COLORS = {
  yes: "oklch(0.72 0.18 175)",
  yesBg: "oklch(0.72 0.18 175 / 15%)",
  yesGlow: "0 0 30px oklch(0.72 0.18 175 / 60%)",
  no: "oklch(0.68 0.20 25)",
  noBg: "oklch(0.68 0.20 25 / 15%)",
  noGlow: "0 0 30px oklch(0.68 0.20 25 / 60%)",
  invalid: "oklch(0.80 0.16 90)",
  invalidBg: "oklch(0.80 0.16 90 / 15%)",
  invalidGlow: "0 0 30px oklch(0.80 0.16 90 / 60%)",
  oracle: "oklch(0.75 0.20 280)",
  oracleBg: "oklch(0.75 0.20 280 / 12%)",
  oracleGlow: "0 0 25px oklch(0.75 0.20 280 / 40%)",
  text: "oklch(0.95 0.02 280)",
  textMuted: "oklch(0.65 0.04 280)",
  textDim: "oklch(0.50 0.04 280)",
  cardBg: "oklch(0.12 0.03 280 / 70%)",
  border: "oklch(0.65 0.25 290 / 15%)",
} as const;

const resultConfig = {
  YES: {
    color: COLORS.yes,
    bg: COLORS.yesBg,
    glow: COLORS.yesGlow,
    icon: CheckCircle2,
  },
  NO: { color: COLORS.no, bg: COLORS.noBg, glow: COLORS.noGlow, icon: XCircle },
  INVALID: {
    color: COLORS.invalid,
    bg: COLORS.invalidBg,
    glow: COLORS.invalidGlow,
    icon: AlertTriangle,
  },
};

// All markets now use AI web search resolution
const DEFAULT_METHOD = {
  icon: Globe,
  label: "AI Research",
  color: "oklch(0.70 0.22 290)",
};

interface ResolutionDetailsProps {
  result: MarketResult;
  confidence: BetMarket["resolutionConfidence"];
  sources: BetMarket["resolutionSources"];
  reasoning?: string | null;
  className?: string;
}

// Arc gauge for confidence
function ConfidenceArc({ value }: { value: number }) {
  const radius = 40;
  const strokeWidth = 8;
  const circumference = Math.PI * radius;
  const progress = (value / 100) * circumference;

  const getColor = (v: number) => {
    if (v >= 85) {
      return "oklch(0.72 0.18 175)";
    }
    if (v >= 70) {
      return "oklch(0.75 0.20 145)";
    }
    if (v >= 50) {
      return "oklch(0.80 0.16 90)";
    }
    return "oklch(0.68 0.20 25)";
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg
        aria-label={`Confidence: ${value}%`}
        className="-rotate-90"
        height={radius + strokeWidth}
        role="img"
        width={radius * 2 + strokeWidth}
      >
        <title>Confidence: {value}%</title>
        <defs>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="arcGradient"
            x1="0"
            x2="100"
            y1="0"
            y2="0"
          >
            <stop offset="0%" stopColor={getColor(value)} stopOpacity="0.3" />
            <stop offset="100%" stopColor={getColor(value)} />
          </linearGradient>
        </defs>
        <path
          d={`M ${strokeWidth / 2 + radius} ${strokeWidth / 2 + radius} m -${radius} 0 a ${radius} ${radius} 0 1 1 ${radius * 2} 0`}
          fill="none"
          stroke="oklch(0.20 0.02 280)"
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
        <motion.path
          animate={{ strokeDashoffset: circumference - progress }}
          d={`M ${strokeWidth / 2 + radius} ${strokeWidth / 2 + radius} m -${radius} 0 a ${radius} ${radius} 0 1 1 ${radius * 2} 0`}
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          stroke="url(#arcGradient)"
          strokeDasharray={circumference}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={{ filter: `drop-shadow(0 0 6px ${getColor(value)})` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <motion.span
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-1/2 font-bold font-heading text-2xl"
        initial={{ opacity: 0, scale: 0.5 }}
        style={{ color: getColor(value) }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        {value}%
      </motion.span>
    </div>
  );
}

// Source card
function SourceCard({
  source,
  index,
}: {
  source: { url: string; snippet: string };
  index: number;
}) {
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url.slice(0, 30);
    }
  };

  return (
    <motion.a
      animate={{ opacity: 1, y: 0 }}
      className="group block rounded-xl p-3 transition-all"
      href={source.url}
      initial={{ opacity: 0, y: 20 }}
      rel="noopener noreferrer"
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
      }}
      target="_blank"
      transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
      whileHover={{
        y: -4,
        boxShadow: COLORS.oracleGlow,
        borderColor: "oklch(0.65 0.25 290 / 40%)",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <ExternalLink
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          style={{ color: COLORS.oracle }}
        />
        <span
          className="font-heading font-medium text-sm"
          style={{ color: COLORS.text }}
        >
          {getDomain(source.url)}
        </span>
      </div>
      <p
        className="line-clamp-2 text-sm leading-relaxed"
        style={{ color: COLORS.textMuted }}
      >
        {source.snippet}
      </p>
    </motion.a>
  );
}

export function ResolutionDetails({
  result,
  confidence,
  sources,
  reasoning,
  className,
}: ResolutionDetailsProps) {
  const config = resultConfig[result];
  const ResultIcon = config.icon;
  // All markets now use AI web search
  const method = DEFAULT_METHOD;
  const MethodIcon = method.icon;

  return (
    <div className={className}>
      {/* Verdict Banner */}
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="relative mb-6 overflow-hidden rounded-2xl p-6 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        style={{
          background: `linear-gradient(135deg, ${config.bg} 0%, oklch(0.08 0.02 270 / 80%) 100%)`,
          border: `2px solid ${config.color}40`,
          boxShadow: config.glow,
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Pulsing border effect */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ border: `2px solid ${config.color}` }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />

        <motion.div
          animate={{ scale: 1, rotate: 0 }}
          className="mb-3 inline-flex items-center justify-center rounded-full p-3"
          initial={{ scale: 0, rotate: -180 }}
          style={{ background: config.bg }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        >
          <ResultIcon className="h-8 w-8" style={{ color: config.color }} />
        </motion.div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.3 }}
        >
          <p
            className="mb-1 font-heading text-xs uppercase tracking-widest"
            style={{ color: COLORS.textMuted }}
          >
            Verdict
          </p>
          <h3
            className="font-bold font-heading text-3xl"
            style={{ color: config.color }}
          >
            {result}
          </h3>
        </motion.div>
      </motion.div>

      {/* AI Reasoning */}
      {reasoning && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          style={{
            background: COLORS.oracleBg,
            border: `1px solid ${COLORS.oracle}40`,
          }}
          transition={{ delay: 0.25 }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: COLORS.oracle }} />
            <p
              className="font-heading text-xs uppercase tracking-wider"
              style={{ color: COLORS.oracle }}
            >
              AI Analysis
            </p>
          </div>
          <p className="leading-relaxed" style={{ color: COLORS.text }}>
            {reasoning}
          </p>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {/* Confidence */}
        {confidence !== null && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4"
            initial={{ opacity: 0, y: 20 }}
            style={{
              background: COLORS.cardBg,
              border: `1px solid ${COLORS.border}`,
            }}
            transition={{ delay: 0.2 }}
          >
            <p
              className="mb-3 text-center font-heading text-xs uppercase tracking-wider"
              style={{ color: COLORS.textMuted }}
            >
              Confidence
            </p>
            <ConfidenceArc value={confidence} />
          </motion.div>
        )}

        {/* Resolution Method */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
          }}
          transition={{ delay: 0.3 }}
        >
          <p
            className="mb-3 font-heading text-xs uppercase tracking-wider"
            style={{ color: COLORS.textMuted }}
          >
            Method
          </p>
          <motion.div
            animate={{ scale: 1 }}
            className="mb-2 rounded-xl p-3"
            initial={{ scale: 0 }}
            style={{ background: `${method.color}20` }}
            transition={{ delay: 0.4, type: "spring" }}
          >
            <MethodIcon className="h-6 w-6" style={{ color: method.color }} />
          </motion.div>
          <span
            className="font-heading font-medium text-sm"
            style={{ color: COLORS.text }}
          >
            {method.label}
          </span>
        </motion.div>
      </div>

      {/* Evidence Sources */}
      {sources && sources.length > 0 && (
        <motion.div
          animate={{ opacity: 1 }}
          initial={{ opacity: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <div
              className="h-px flex-1"
              style={{ background: COLORS.border }}
            />
            <span
              className="font-heading text-xs uppercase tracking-wider"
              style={{ color: COLORS.textMuted }}
            >
              Evidence
            </span>
            <div
              className="h-px flex-1"
              style={{ background: COLORS.border }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {sources.map((source, index) => (
              <SourceCard
                index={index}
                key={`${source.url}-${index}`}
                source={source}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
