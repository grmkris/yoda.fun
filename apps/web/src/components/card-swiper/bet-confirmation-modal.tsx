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
import type { MarketCard } from "./card-front";

interface BetConfirmationModalProps {
  market: MarketCard | null;
  onConfirm: (vote: "YES" | "NO") => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function BetConfirmationModal({
  market,
  onConfirm,
  onCancel,
  isLoading,
}: BetConfirmationModalProps) {
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
        <DialogHeader>
          <DialogTitle
            className="font-heading text-xl"
            style={{ color: "oklch(0.95 0.02 280)" }}
          >
            Place Your Prediction
          </DialogTitle>
          <DialogDescription
            className="font-heading text-sm"
            style={{ color: "oklch(0.75 0.04 280)" }}
          >
            {market.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Market info card */}
          <div
            className="rounded-2xl p-4"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.18 0.04 280 / 60%), oklch(0.15 0.03 290 / 40%))",
              border: "1px solid oklch(1 0 0 / 8%)",
            }}
          >
            <p
              className="mb-3 line-clamp-2 text-sm leading-relaxed"
              style={{ color: "oklch(0.80 0.03 280)" }}
            >
              {market.description}
            </p>
            <div className="flex items-center justify-between">
              <span
                className="font-heading text-sm"
                style={{ color: "oklch(0.65 0.04 280)" }}
              >
                On-chain bet
              </span>
              <span
                className="font-accent font-bold text-sm"
                style={{
                  color: "oklch(0.72 0.18 175)",
                }}
              >
                cMISHA tokens
              </span>
            </div>
          </div>

          {/* Vote buttons */}
          <div className="grid grid-cols-2 gap-4">
            {/* YES Button */}
            <button
              className="group relative h-16 overflow-hidden rounded-2xl font-bold font-heading text-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              disabled={isLoading}
              onClick={() => onConfirm("YES")}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.60 0.16 180))",
                color: "oklch(0.08 0.02 175)",
                boxShadow: "0 0 25px oklch(0.72 0.18 175 / 35%)",
              }}
              type="button"
            >
              <span className="relative z-10">{isLoading ? "..." : "YES"}</span>
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.80 0.16 175), oklch(0.72 0.18 175))",
                  boxShadow: "0 0 40px oklch(0.72 0.18 175 / 50%)",
                }}
              />
            </button>

            {/* NO Button */}
            <button
              className="group relative h-16 overflow-hidden rounded-2xl font-bold font-heading text-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              disabled={isLoading}
              onClick={() => onConfirm("NO")}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.68 0.20 25), oklch(0.55 0.18 30))",
                color: "oklch(0.08 0.02 25)",
                boxShadow: "0 0 25px oklch(0.68 0.20 25 / 35%)",
              }}
              type="button"
            >
              <span className="relative z-10">{isLoading ? "..." : "NO"}</span>
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.75 0.18 25), oklch(0.68 0.20 25))",
                  boxShadow: "0 0 40px oklch(0.68 0.20 25 / 50%)",
                }}
              />
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full rounded-xl font-heading"
            disabled={isLoading}
            onClick={onCancel}
            style={{
              color: "oklch(0.60 0.04 280)",
            }}
            variant="ghost"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
