"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSetUsername } from "@/hooks/use-profile";

interface UsernameNudgeModalProps {
  open: boolean;
  onComplete: () => void;
}

export function UsernameNudgeModal({
  open,
  onComplete,
}: UsernameNudgeModalProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { mutate: setUsernameMutation, isPending } = useSetUsername();

  const validateUsername = (value: string) => {
    if (value.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (value.length > 20) {
      return "Username must be at most 20 characters";
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUsernameMutation(username, {
      onSuccess: () => {
        onComplete();
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to set username");
      },
    });
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your username</DialogTitle>
          <DialogDescription>
            Pick a unique username for your profile. You can change this later
            in settings.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Input
              autoFocus
              disabled={isPending}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="cooltrader42"
              value={username}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              disabled={isPending}
              onClick={handleSkip}
              type="button"
              variant="ghost"
            >
              Skip for now
            </Button>
            <Button disabled={isPending || !username.trim()} type="submit">
              {isPending ? "Setting..." : "Set Username"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
