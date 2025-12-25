"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { BetMarket, MarketResult } from "@/lib/orpc-types";
import { cn } from "@/lib/utils";
import { ConfidenceBar } from "./confidence-bar";
import { MethodBadge } from "./method-badge";
import { SourcesList } from "./sources-list";

interface ResolutionDetailsProps {
  result: MarketResult;
  confidence: BetMarket["resolutionConfidence"];
  resolutionType: BetMarket["resolutionType"];
  sources: BetMarket["resolutionSources"];
  className?: string;
  defaultExpanded?: boolean;
}

export function ResolutionDetails({
  result,
  confidence,
  resolutionType,
  sources,
  className,
  defaultExpanded = false,
}: ResolutionDetailsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const resultColor = {
    YES: "text-green-500",
    NO: "text-red-500",
    INVALID: "text-yellow-500",
  }[result];

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <button
        className="flex w-full items-center justify-between p-3 text-left"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <div className="flex items-center gap-3">
          <span className={cn("font-bold text-sm", resultColor)}>{result}</span>
          {confidence !== null && (
            <div className="w-20">
              <ConfidenceBar value={confidence} />
            </div>
          )}
          {resolutionType && <MethodBadge type={resolutionType} />}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t px-3 py-3">
          {confidence !== null && (
            <div>
              <p className="mb-1 font-medium text-muted-foreground text-xs">
                Confidence
              </p>
              <ConfidenceBar value={confidence} />
            </div>
          )}

          {resolutionType && (
            <div>
              <p className="mb-1 font-medium text-muted-foreground text-xs">
                Resolution Method
              </p>
              <MethodBadge type={resolutionType} />
            </div>
          )}

          {sources && sources.length > 0 && <SourcesList sources={sources} />}
        </div>
      )}
    </div>
  );
}
