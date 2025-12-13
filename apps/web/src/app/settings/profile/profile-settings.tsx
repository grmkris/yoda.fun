"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMyProfile, useUpdateProfile } from "@/hooks/use-profile";

export default function ProfileSettings() {
  const { data, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [showBetHistory, setShowBetHistory] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize form with data once loaded
  if (data?.profile && !initialized) {
    setBio(data.profile.bio ?? "");
    setAvatarUrl(data.profile.avatarUrl ?? "");
    setTwitterHandle(data.profile.twitterHandle ?? "");
    setTelegramHandle(data.profile.telegramHandle ?? "");
    setIsPublic(data.profile.isPublic ?? true);
    setShowStats(data.profile.showStats ?? true);
    setShowBetHistory(data.profile.showBetHistory ?? true);
    setInitialized(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      bio: bio || undefined,
      avatarUrl: avatarUrl || undefined,
      twitterHandle: twitterHandle || undefined,
      telegramHandle: telegramHandle || undefined,
      isPublic,
      showStats,
      showBetHistory,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            This information will be displayed publicly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              maxLength={160}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setBio(e.target.value)
              }
              placeholder="Tell others about yourself..."
              rows={3}
              value={bio}
            />
            <p className="text-muted-foreground text-xs">
              {bio.length}/160 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar URL</Label>
            <Input
              id="avatar"
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              type="url"
              value={avatarUrl}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter Handle</Label>
              <div className="flex">
                <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  className="rounded-l-none"
                  id="twitter"
                  onChange={(e) =>
                    setTwitterHandle(e.target.value.replace("@", ""))
                  }
                  placeholder="username"
                  value={twitterHandle}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram Handle</Label>
              <div className="flex">
                <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  className="rounded-l-none"
                  id="telegram"
                  onChange={(e) =>
                    setTelegramHandle(e.target.value.replace("@", ""))
                  }
                  placeholder="username"
                  value={telegramHandle}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>
            Control what others can see on your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Profile</Label>
              <p className="text-muted-foreground text-sm">
                Allow others to view your profile
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Stats</Label>
              <p className="text-muted-foreground text-sm">
                Display your betting statistics
              </p>
            </div>
            <Switch
              checked={showStats}
              disabled={!isPublic}
              onCheckedChange={setShowStats}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Bet History</Label>
              <p className="text-muted-foreground text-sm">
                Allow others to see your past bets
              </p>
            </div>
            <Switch
              checked={showBetHistory}
              disabled={!isPublic}
              onCheckedChange={setShowBetHistory}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button disabled={updateProfile.isPending} type="submit">
          {updateProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
