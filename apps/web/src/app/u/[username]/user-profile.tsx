"use client";

import type { UserId } from "@yoda.fun/shared/typeid";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsFollowing, useToggleFollow } from "@/hooks/use-follow";
import { useProfileByUsername } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={cn("font-bold text-2xl", !!highlight && "text-emerald-500")}
      >
        {value}
      </p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

function FollowButton({ userId }: { userId: UserId }) {
  const { data: session } = useSession();
  const { data: followStatus, isLoading } = useIsFollowing(userId);
  const toggleFollow = useToggleFollow();

  // Don't show if not logged in or if it's the user's own profile
  if (!session?.user || session.user.id === userId) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="h-10 w-24" />;
  }

  return (
    <Button
      disabled={toggleFollow.isPending}
      onClick={() => toggleFollow.mutate(userId)}
      variant={followStatus?.isFollowing ? "outline" : "default"}
    >
      {followStatus?.isFollowing ? "Following" : "Follow"}
    </Button>
  );
}

export default function UserProfile({ username }: { username: string }) {
  const [tab, setTab] = useState("activity");
  const { data, isLoading, error } = useProfileByUsername(username);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">User not found</p>
          <Link
            className="mt-4 inline-block text-primary hover:underline"
            href="/"
          >
            Go home
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (data.isPrivate) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <span className="text-4xl">🔒</span>
          </div>
          <h2 className="font-bold text-xl">
            @{data.user?.username ?? username}
          </h2>
          <p className="mt-2 text-muted-foreground">This profile is private</p>
        </CardContent>
      </Card>
    );
  }

  const { user, profile, stats } = data;
  const displayName =
    user?.displayUsername ?? user?.username ?? user?.name ?? username;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {profile?.avatarUrl ? (
            <Image
              alt={displayName}
              className="object-cover"
              fill
              sizes="96px"
              src={profile.avatarUrl}
            />
          ) : (
            <span className="font-bold text-3xl text-muted-foreground">
              {displayName[0]?.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-2xl">{displayName}</h1>
            {user?.id ? <FollowButton userId={user.id} /> : null}
          </div>
          {user?.username ? (
            <p className="text-muted-foreground">@{user.username}</p>
          ) : null}
          {profile?.bio ? <p className="mt-2">{profile.bio}</p> : null}

          {/* Social Links */}
          <div className="mt-2 flex gap-4">
            {profile?.twitterHandle ? (
              <a
                className="text-muted-foreground text-sm hover:text-foreground"
                href={`https://twitter.com/${profile.twitterHandle}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                @{profile.twitterHandle}
              </a>
            ) : null}
          </div>
        </div>

        {/* Follow Counts */}
        <div className="flex gap-6">
          <div className="text-center">
            <p className="font-bold text-xl">{profile?.followerCount ?? 0}</p>
            <p className="text-muted-foreground text-xs">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-xl">{profile?.followingCount ?? 0}</p>
            <p className="text-muted-foreground text-xs">Following</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats ? (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
            <StatCard label="Total Bets" value={stats.totalBets} />
            <StatCard
              highlight
              label="Win Rate"
              value={`${Number(stats.winRate).toFixed(0)}%`}
            />
            <StatCard
              label="Current Streak"
              value={`${stats.currentStreak} 🔥`}
            />
            <StatCard
              highlight={Number(stats.totalProfit) > 0}
              label="Total Profit"
              value={`$${Number(stats.totalProfit).toFixed(2)}`}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Activity */}
      <Card>
        <Tabs onValueChange={setTab} value={tab}>
          <CardHeader>
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="bets">Bets</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent className="mt-0" value="activity">
              <p className="py-8 text-center text-muted-foreground">
                Activity feed coming soon
              </p>
            </TabsContent>
            <TabsContent className="mt-0" value="bets">
              <p className="py-8 text-center text-muted-foreground">
                Bet history coming soon
              </p>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
