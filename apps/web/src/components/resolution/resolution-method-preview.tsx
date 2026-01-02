"use client";

import { Globe } from "lucide-react";
import { motion } from "motion/react";

const COLORS = {
  text: "oklch(0.95 0.02 280)",
  textMuted: "oklch(0.65 0.04 280)",
  cardBg: "oklch(0.12 0.03 280 / 70%)",
  border: "oklch(0.65 0.25 290 / 15%)",
} as const;

const METHOD = {
  icon: Globe,
  color: "oklch(0.70 0.22 290)",
  description: "Resolved via web search and AI analysis",
};

interface ResolutionMethodPreviewProps {
  criteria?: string | null;
  className?: string;
}

export function ResolutionMethodPreview({
  criteria,
  className,
}: ResolutionMethodPreviewProps) {
  if (!criteria) {
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
      <div className="mb-4 flex items-center gap-3">
        <motion.div
          animate={{ scale: 1 }}
          className="rounded-xl p-2.5"
          initial={{ scale: 0 }}
          style={{ background: `${METHOD.color}20` }}
          transition={{ delay: 0.4, type: "spring" }}
        >
          <Globe className="h-5 w-5" style={{ color: METHOD.color }} />
        </motion.div>
        <div>
          <h3
            className="font-heading font-medium text-sm"
            style={{ color: COLORS.text }}
          >
            How This Will Be Resolved
          </h3>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>
            {METHOD.description}
          </p>
        </div>
      </div>

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
    </motion.div>
  );
}
