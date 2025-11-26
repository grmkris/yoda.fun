"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalance, useBetHistory } from "@/hooks";

function StatCard({
  title,
  value,
  subtitle,
  isLoading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <p className="font-bold text-2xl">{value}</p>
            {subtitle && (
              <p className="text-muted-foreground text-xs">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: balance, isLoading: balanceLoading } = useBalance();
  const { data: activeBets, isLoading: betsLoading } = useBetHistory({
    status: "ACTIVE",
    limit: 5,
  });
  const { data: wonBets } = useBetHistory({ status: "WON", limit: 100 });

  const availableBalance = Number(balance?.available ?? 0);
  const totalDeposited = Number(balance?.totalDeposited ?? 0);
  const totalWithdrawn = Number(balance?.totalWithdrawn ?? 0);
  const totalWon = wonBets?.bets?.reduce(
    (sum, b) => sum + Number(b.bet.payout ?? 0),
    0
  ) ?? 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          isLoading={balanceLoading}
          title="Available Balance"
          value={`$${availableBalance.toFixed(2)}`}
        />
        <StatCard
          isLoading={balanceLoading}
          subtitle="Lifetime"
          title="Total Deposited"
          value={`$${totalDeposited.toFixed(2)}`}
        />
        <StatCard
          isLoading={balanceLoading}
          subtitle="Lifetime"
          title="Total Withdrawn"
          value={`$${totalWithdrawn.toFixed(2)}`}
        />
        <StatCard
          isLoading={betsLoading}
          subtitle="From winning bets"
          title="Total Won"
          value={`$${totalWon.toFixed(2)}`}
        />
      </div>

      {/* Active Bets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Bets</CardTitle>
          <Link
            className="text-primary text-sm hover:underline"
            href="/bets"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {betsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton className="h-16 w-full" key={i} />
              ))}
            </div>
          ) : activeBets?.bets?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No active bets. Start predicting!
            </p>
          ) : (
            <div className="space-y-3">
              {activeBets?.bets?.map(({ bet, market }) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3"
                  key={bet.id}
                >
                  <div className="flex-1">
                    <p className="line-clamp-1 font-medium text-sm">
                      {market.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Your vote:{" "}
                      <span
                        className={
                          bet.vote === "YES"
                            ? "text-emerald-600"
                            : "text-red-500"
                        }
                      >
                        {bet.vote}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${bet.amount}</p>
                    <p className="text-muted-foreground text-xs">
                      {market.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
