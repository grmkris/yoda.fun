"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBetHistory } from "@/hooks";

type BetStatus = "ACTIVE" | "WON" | "LOST" | "REFUNDED" | undefined;

const STATUS_FILTERS: { label: string; value: BetStatus }[] = [
  { label: "All", value: undefined },
  { label: "Active", value: "ACTIVE" },
  { label: "Won", value: "WON" },
  { label: "Lost", value: "LOST" },
  { label: "Refunded", value: "REFUNDED" },
];

function getStatusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "WON":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "LOST":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "REFUNDED":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BetsHistory() {
  const [statusFilter, setStatusFilter] = useState<BetStatus>(undefined);
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
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            onClick={() => {
              setStatusFilter(filter.value);
              setPage(0);
            }}
            size="sm"
            variant={statusFilter === filter.value ? "default" : "outline"}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton className="h-24 w-full" key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Failed to load bets</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && bets.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} bets found`
                : "No bets yet. Start predicting!"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bets List */}
      {!isLoading && !error && bets.length > 0 && (
        <div className="space-y-3">
          {bets.map(({ bet, market }) => (
            <Card key={bet.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-medium leading-tight">{market.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(bet.status)}`}
                      >
                        {bet.status}
                      </span>
                      <span className="text-muted-foreground">
                        Vote:{" "}
                        <span
                          className={
                            bet.vote === "YES"
                              ? "font-medium text-emerald-600"
                              : "font-medium text-red-500"
                          }
                        >
                          {bet.vote}
                        </span>
                      </span>
                      {market.category && (
                        <span className="text-muted-foreground">
                          {market.category}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Placed on {formatDate(bet.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${bet.amount}</p>
                    {bet.payout && (
                      <p className="text-emerald-600 text-sm">
                        Won ${bet.payout}
                      </p>
                    )}
                    {market.result && (
                      <p className="text-muted-foreground text-xs">
                        Result: {market.result}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && (hasPrevious || hasMore) && (
        <div className="flex justify-center gap-2">
          <Button
            disabled={!hasPrevious}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            variant="outline"
          >
            Previous
          </Button>
          <Button
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
