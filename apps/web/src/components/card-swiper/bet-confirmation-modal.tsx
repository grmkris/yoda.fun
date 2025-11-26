"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MarketCard } from "./game-card";

type BetConfirmationModalProps = {
  market: MarketCard | null;
  onConfirm: (vote: "YES" | "NO") => void;
  onCancel: () => void;
  isLoading: boolean;
};

export function BetConfirmationModal({
  market,
  onConfirm,
  onCancel,
  isLoading,
}: BetConfirmationModalProps) {
  if (!market) return null;

  return (
    <Dialog open={!!market} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Place Your Bet</DialogTitle>
          <DialogDescription className="text-sm">
            {market.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Market info */}
          <div className="rounded-lg bg-muted p-4">
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
              {market.description}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Bet Amount:</span>
              <span className="font-bold text-emerald-600">
                ${market.betAmount}
              </span>
            </div>
          </div>

          {/* Vote buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg font-bold"
              disabled={isLoading}
              onClick={() => onConfirm("YES")}
              variant="default"
            >
              {isLoading ? "..." : "YES"}
            </Button>
            <Button
              className="h-16 text-lg font-bold"
              disabled={isLoading}
              onClick={() => onConfirm("NO")}
              variant="secondary"
            >
              {isLoading ? "..." : "NO"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={isLoading}
            onClick={onCancel}
            variant="ghost"
          >
            Skip this market
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
