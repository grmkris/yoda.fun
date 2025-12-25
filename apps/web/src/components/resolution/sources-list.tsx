"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { MarketResolutionSources } from "@/lib/orpc-types";
import { cn } from "@/lib/utils";

interface SourcesListProps {
  sources: NonNullable<MarketResolutionSources>;
  className?: string;
}

export function SourcesList({ sources, className }: SourcesListProps) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) {
    return null;
  }

  const displaySources = expanded ? sources : sources.slice(0, 2);
  const hasMore = sources.length > 2;

  return (
    <div className={cn("space-y-2", className)}>
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span className="font-medium text-muted-foreground text-xs">
          Sources ({sources.length})
        </span>
        {hasMore && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        )}
      </button>
      <div className="space-y-1.5">
        {displaySources.map((source, index) => (
          <a
            className="group flex items-start gap-2 rounded-md bg-muted/50 px-2 py-1.5 transition-colors hover:bg-muted"
            href={source.url}
            key={`source-${index}-${source.url.slice(0, 20)}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs">{getDomain(source.url)}</p>
              <p className="line-clamp-2 text-muted-foreground text-xs">
                {source.snippet}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.slice(0, 30);
  }
}
