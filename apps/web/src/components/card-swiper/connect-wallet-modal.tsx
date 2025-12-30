"use client";

import { AppKitButton } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MarketCard } from "./card-front";

interface ConnectWalletModalProps {
  market: MarketCard | null;
  onCancel: () => void;
}

export function ConnectWalletModal({
  market,
  onCancel,
}: ConnectWalletModalProps) {
  if (!market) {
    return null;
  }

  return (
    <Dialog onOpenChange={(open) => !open && onCancel()} open={!!market}>
      <DialogContent
        className="border-0 sm:max-w-md sm:rounded-3xl"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.14 0.04 280 / 95%), oklch(0.10 0.03 270 / 98%))",
          backdropFilter: "blur(24px)",
          boxShadow:
            "0 0 0 1px oklch(0.65 0.25 290 / 20%), 0 25px 50px -12px oklch(0 0 0 / 50%), 0 0 80px oklch(0.65 0.25 290 / 10%)",
        }}
      >
        <DialogHeader className="text-center">
          <div
            className="mx-auto mb-4 text-5xl"
            style={{
              filter: "drop-shadow(0 0 20px oklch(0.72 0.18 175 / 50%))",
            }}
          >
            🔮
          </div>
          <DialogTitle
            className="font-heading text-xl"
            style={{ color: "oklch(0.95 0.02 280)" }}
          >
            Connect to Place Bets
          </DialogTitle>
          <DialogDescription
            className="text-sm"
            style={{ color: "oklch(0.70 0.04 280)" }}
          >
            Connect your wallet to start predicting and winning
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Market preview */}
          <div
            className="rounded-2xl p-4"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.18 0.04 280 / 60%), oklch(0.15 0.03 290 / 40%))",
              border: "1px solid oklch(1 0 0 / 8%)",
            }}
          >
            <p
              className="mb-2 font-heading font-medium text-sm"
              style={{ color: "oklch(0.65 0.04 280)" }}
            >
              You're interested in:
            </p>
            <p
              className="line-clamp-2 font-medium text-sm leading-relaxed"
              style={{ color: "oklch(0.90 0.02 280)" }}
            >
              {market.title}
            </p>
          </div>

          <AppKitButton />
        </div>

        <DialogFooter>
          <Button
            className="w-full rounded-xl font-heading"
            onClick={onCancel}
            style={{
              color: "oklch(0.60 0.04 280)",
            }}
            variant="ghost"
          >
            Keep browsing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
