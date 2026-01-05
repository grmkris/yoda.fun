"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentProfile, useRecentFeedback } from "@/hooks/use-agent";
import { ERC8004_CONTRACTS } from "@/lib/erc8004/contracts";

function ScoreCard({
  label,
  score,
  count,
}: {
  label: string;
  score: number | null;
  count: number;
}) {
  const displayScore = score !== null ? `${score}%` : "N/A";

  return (
    <div className="rounded-lg bg-muted p-4 text-center">
      <p className="font-bold text-3xl">{displayScore}</p>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-muted-foreground text-xs">{count} ratings</p>
    </div>
  );
}

function FeedbackTypeLabel({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${
        type === "RESOLUTION"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
          : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
      }`}
    >
      {type === "RESOLUTION" ? "Resolution" : "Quality"}
    </span>
  );
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          className={score >= star ? "text-yellow-400" : "text-gray-300"}
          key={star}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function AgentProfile() {
  const { data: profile, isLoading: profileLoading } = useAgentProfile();
  const { data: recentFeedback, isLoading: feedbackLoading } =
    useRecentFeedback({
      limit: 10,
    });

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Agent not registered yet. Run the registration script to create the
            Yoda agent identity on ERC-8004.
          </p>
        </CardContent>
      </Card>
    );
  }

  const scanUrl = `https://8004scan.io/agent/eip155:${ERC8004_CONTRACTS.chainId}:${ERC8004_CONTRACTS.identityRegistry}:${profile.agentId}`;

  const renderFeedbackContent = () => {
    if (feedbackLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton className="h-16 w-full" key={i} />
          ))}
        </div>
      );
    }

    if (recentFeedback && recentFeedback.length > 0) {
      return (
        <div className="space-y-4">
          {recentFeedback.map((item) => (
            <div
              className="flex items-center justify-between rounded-lg border p-3"
              key={item.feedback.id}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FeedbackTypeLabel type={item.feedback.feedbackType} />
                  <span className="text-muted-foreground text-sm">
                    by @
                    {item.user.displayUsername ?? item.user.username ?? "anon"}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground text-sm">
                  {item.market.title}
                </p>
              </div>
              <div className="text-right">
                <ScoreStars score={item.feedback.score} />
                {item.feedback.txHash && (
                  <Link
                    className="text-muted-foreground text-xs hover:underline"
                    href={`https://sepolia.basescan.org/tx/${item.feedback.txHash}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View tx
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <p className="py-8 text-center text-muted-foreground">
        No feedback yet. Users can rate markets after betting.
      </p>
    );
  };

  return (
    <div className="space-y-6">
      {/* Agent Identity Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600">
              <span className="text-4xl">🧙</span>
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-2xl">{profile.name}</h1>
              <p className="text-muted-foreground">AI Market Agent</p>
              <p className="font-mono text-muted-foreground text-xs">
                Agent ID: #{profile.agentId}
              </p>
            </div>
            <a
              className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
              href={scanUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              View on 8004scan
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {profile.description && (
            <p className="text-muted-foreground text-sm">
              {profile.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-1">
              Chain: Base Sepolia
            </span>
            <span className="rounded-full bg-muted px-2 py-1 font-mono">
              {profile.ownerAddress.slice(0, 6)}...
              {profile.ownerAddress.slice(-4)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Reputation Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Reputation Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <ScoreCard
              count={profile.resolutionCount}
              label="Resolution Accuracy"
              score={profile.resolutionScore}
            />
            <ScoreCard
              count={profile.qualityCount}
              label="Market Quality"
              score={profile.qualityScore}
            />
          </div>
          {profile.lastCacheUpdate && (
            <p className="mt-4 text-center text-muted-foreground text-xs">
              Last updated: {new Date(profile.lastCacheUpdate).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>{renderFeedbackContent()}</CardContent>
      </Card>

      {/* ERC-8004 Info */}
      <Card>
        <CardHeader>
          <CardTitle>About ERC-8004</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Yoda's identity and reputation are tracked on-chain using the{" "}
            <Link
              className="text-primary underline"
              href="https://eips.ethereum.org/EIPS/eip-8004"
              rel="noopener noreferrer"
              target="_blank"
            >
              ERC-8004 Trustless Agents
            </Link>{" "}
            protocol. This provides transparent, verifiable reputation that:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground text-sm">
            <li>Cannot be manipulated or deleted</li>
            <li>Is portable across platforms</li>
            <li>Is cryptographically verified</li>
            <li>Is visible to anyone on the blockchain</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
