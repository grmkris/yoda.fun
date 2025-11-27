"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFollowingActivity, useGlobalActivity } from "@/hooks";
import { authClient } from "@/lib/auth-client";

type FeedType = "global" | "following";

type ActivityData = {
  id: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    displayUsername: string | null;
    image: string | null;
  };
};

function ActivityCard({ activity }: { activity: ActivityData }) {
  const { user, type, metadata, createdAt } = activity;
  const displayName =
    user.displayUsername ?? user.username ?? user.name ?? "Anonymous";

  const getActivityContent = () => {
    switch (type) {
      case "BET_PLACED":
        return (
          <>
            bet{" "}
            <span
              className={
                metadata?.vote === "YES" ? "text-emerald-500" : "text-red-500"
              }
            >
              {metadata?.vote as string}
            </span>{" "}
            on "{metadata?.marketTitle as string}"
          </>
        );
      case "BET_WON":
        return (
          <>
            won{" "}
            <span className="text-emerald-500">
              ${metadata?.payout as string}
            </span>{" "}
            on "{metadata?.marketTitle as string}"
          </>
        );
      case "BET_LOST":
        return <>lost on "{metadata?.marketTitle as string}"</>;
      case "STREAK_MILESTONE":
        return (
          <>
            reached a{" "}
            <span className="text-amber-500">
              {metadata?.streakCount as number} win streak
            </span>{" "}
            🔥
          </>
        );
      case "FOLLOWED_USER":
        return (
          <>
            started following{" "}
            <Link
              className="text-primary hover:underline"
              href={`/u/${metadata?.followedUsername as string}`}
            >
              @{metadata?.followedUsername as string}
            </Link>
          </>
        );
      default:
        return type.replace(/_/g, " ").toLowerCase();
    }
  };

  const getIcon = () => {
    switch (type) {
      case "BET_PLACED":
        return "📊";
      case "BET_WON":
        return "🎉";
      case "BET_LOST":
        return "😔";
      case "STREAK_MILESTONE":
        return "🔥";
      case "FOLLOWED_USER":
        return "👤";
      default:
        return "📝";
    }
  };

  return (
    <Card>
      <CardContent className="flex items-start gap-4 py-4">
        <Link
          className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted"
          href={`/u/${user.username}`}
        >
          {user.image ? (
            <Image
              alt={displayName}
              className="object-cover"
              fill
              sizes="48px"
              src={user.image}
            />
          ) : (
            <span className="font-medium text-muted-foreground">
              {displayName[0]?.toUpperCase()}
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <p>
            <Link
              className="font-medium hover:underline"
              href={`/u/${user.username}`}
            >
              {displayName}
            </Link>{" "}
            {getActivityContent()}
          </p>
          <p className="text-muted-foreground text-sm">
            {formatRelativeTime(new Date(createdAt))}
          </p>
        </div>

        <span className="text-2xl">{getIcon()}</span>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) {
    return "just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
}

const SKELETON_IDS_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {SKELETON_IDS_10.map((id) => (
        <Card key={id}>
          <CardContent className="flex items-start gap-4 py-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GlobalFeed() {
  const { data, isLoading } = useGlobalActivity({ limit: 50 });

  if (isLoading) {
    return <ActivitySkeleton />;
  }

  if (!data?.activities?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No activity yet. Be the first to make a prediction!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.activities.map((activity) => (
        <ActivityCard activity={activity as ActivityData} key={activity.id} />
      ))}
    </div>
  );
}

function FollowingFeed() {
  const { data, isLoading } = useFollowingActivity({ limit: 50 });

  if (isLoading) {
    return <ActivitySkeleton />;
  }

  if (!data?.activities?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No activity from people you follow yet.
          </p>
          <Link
            className="mt-2 inline-block text-primary hover:underline"
            href="/leaderboard"
          >
            Find people to follow
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.activities.map((activity) => (
        <ActivityCard activity={activity as ActivityData} key={activity.id} />
      ))}
    </div>
  );
}

export default function ActivityFeed() {
  const { data: session } = authClient.useSession();
  const [feedType, setFeedType] = useState<FeedType>("global");

  return (
    <div className="space-y-6">
      {session?.user && (
        <Tabs
          onValueChange={(v: string) => setFeedType(v as FeedType)}
          value={feedType}
        >
          <TabsList>
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {feedType === "global" ? <GlobalFeed /> : <FollowingFeed />}
    </div>
  );
}
