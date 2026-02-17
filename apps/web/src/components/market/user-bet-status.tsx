"use client";

import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Trophy,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";

const COLORS = {
  yes: "oklch(0.72 0.18 175)",
  yesBg: "oklch(0.72 0.18 175 / 15%)",
  yesGlow: "0 0 20px oklch(0.72 0.18 175 / 40%)",
  no: "oklch(0.68 0.20 25)",
  noBg: "oklch(0.68 0.20 25 / 15%)",
  text: "oklch(0.95 0.02 280)",
  textMuted: "oklch(0.65 0.04 280)",
  textDim: "oklch(0.50 0.04 280)",
  cardBg: "oklch(0.12 0.03 280 / 70%)",
  border: "oklch(0.65 0.25 290 / 15%)",
  gold: "oklch(0.80 0.16 90)",
  goldBg: "oklch(0.80 0.16 90 / 15%)",
  purple: "oklch(0.65 0.25 290)",
  purpleBg: "oklch(0.65 0.25 290 / 15%)",
} as const;

const statusConfig = {
  ACTIVE: {
    label: "Awaiting Resolution",
    icon: Clock,
    color: COLORS.textMuted,
    bg: COLORS.cardBg,
  },
  WON: {
    label: "You Won!",
    icon: Trophy,
    color: COLORS.gold,
    bg: COLORS.goldBg,
  },
  LOST: {
    label: "You Lost",
    icon: XCircle,
    color: COLORS.no,
    bg: COLORS.noBg,
  },
  REFUNDED: {
    label: "Refunded",
    icon: CheckCircle2,
    color: COLORS.textMuted,
    bg: COLORS.cardBg,
  },
};

interface UserBetStatusProps {
  bet: {
    status: "ACTIVE" | "WON" | "LOST" | "REFUNDED";
    onChainTxHash: string;
  };
  className?: string;
}

export function UserBetStatus({ bet, className }: UserBetStatusProps) {
  const status = statusConfig[bet.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      style={{
        background: `linear-gradient(135deg, ${COLORS.purpleBg} 0%, ${COLORS.cardBg} 100%)`,
        backdropFilter: "blur(20px)",
        border: `2px solid ${COLORS.purple}40`,
        borderRadius: "1rem",
        padding: "1.5rem",
      }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: 1, rotate: 0 }}
            className="rounded-xl p-2.5"
            initial={{ scale: 0, rotate: -45 }}
            style={{ background: COLORS.purpleBg }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <CheckCircle2
              className="h-6 w-6"
              style={{ color: COLORS.purple }}
            />
          </motion.div>
          <div>
            <p
              className="font-heading text-xs uppercase tracking-wider"
              style={{ color: COLORS.textMuted }}
            >
              Your Bet
            </p>
            <p
              className="font-bold font-heading text-xl"
              style={{ color: COLORS.purple }}
            >
              Placed
            </p>
          </div>
        </div>

        {/* Status badge */}
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          initial={{ opacity: 0, scale: 0.8 }}
          style={{
            background: status.bg,
            border: `1px solid ${status.color}30`,
          }}
          transition={{ delay: 0.6 }}
        >
          <StatusIcon className="h-3.5 w-3.5" style={{ color: status.color }} />
          <span
            className="font-heading font-medium text-xs"
            style={{ color: status.color }}
          >
            {status.label}
          </span>
        </motion.div>
      </div>

      {/* Tx hash link */}
      {bet.onChainTxHash && (
        <motion.a
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 rounded-xl p-3 transition-colors hover:bg-white/5"
          href={`https://sepolia.etherscan.io/tx/${bet.onChainTxHash}`}
          initial={{ opacity: 0 }}
          rel="noopener noreferrer"
          style={{
            background: "oklch(0.08 0.02 270 / 50%)",
            border: `1px solid ${COLORS.border}`,
          }}
          target="_blank"
          transition={{ delay: 0.7 }}
        >
          <ExternalLink className="h-4 w-4" style={{ color: COLORS.purple }} />
          <span className="font-mono text-xs" style={{ color: COLORS.textDim }}>
            {bet.onChainTxHash.slice(0, 10)}...{bet.onChainTxHash.slice(-8)}
          </span>
        </motion.a>
      )}

      {/* Message for active bets */}
      {bet.status === "ACTIVE" && (
        <motion.p
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-sm"
          initial={{ opacity: 0 }}
          style={{ color: COLORS.textMuted }}
          transition={{ delay: 0.8 }}
        >
          <CheckCircle2
            className="mr-1.5 inline-block h-4 w-4"
            style={{ color: COLORS.purple }}
          />
          Your prediction is locked in. Results coming soon!
        </motion.p>
      )}
    </motion.div>
  );
}
