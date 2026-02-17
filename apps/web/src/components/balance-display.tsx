"use client";

import { Coins, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { formatUnits } from "viem";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmishaBalance } from "@/hooks/use-cmisha-balance";
import { useDecryptCmisha } from "@/hooks/use-decrypt-cmisha";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMishaBalance } from "@/hooks/use-misha-balance";
import { ReferralCard } from "./rewards/referral-card";
import { WrapUnwrap } from "./token/wrap-unwrap";

function RewardsHeader() {
  return (
    <div
      className="flex items-center gap-3 font-heading text-xl"
      style={{ color: "oklch(0.95 0.02 280)" }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.80 0.16 50), oklch(0.70 0.20 30))",
          boxShadow: "0 0 20px oklch(0.80 0.16 50 / 30%)",
        }}
      >
        <Coins className="h-5 w-5 text-white" />
      </div>
      Rewards
    </div>
  );
}

function RewardsContent() {
  return (
    <div className="space-y-4">
      <WrapUnwrap />
      <ReferralCard />
    </div>
  );
}

export function PointsDisplay() {
  const { data: mishaBalance, isLoading } = useMishaBalance();
  const { data: cmishaHandle } = useCmishaBalance();
  const { decryptedBalance, decrypt, isDecrypting, hasHandle } =
    useDecryptCmisha();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isLoading) {
    return <Skeleton className="h-8 w-24 rounded-full" />;
  }

  const formatted =
    mishaBalance != null
      ? Number(formatUnits(mishaBalance, 18)).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })
      : "0";

  const cmishaFormatted =
    decryptedBalance != null
      ? Number(formatUnits(decryptedBalance, 6)).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })
      : null;

  const showCmisha = hasHandle || cmishaHandle != null;

  return (
    <>
      <button
        className="group relative flex items-center gap-1.5 rounded-full px-2 py-1 transition-all duration-200"
        onClick={() => setOpen(true)}
        style={{
          background: "oklch(0.12 0.02 270 / 80%)",
          border: "1px solid oklch(0.65 0.25 290 / 25%)",
          boxShadow: "inset 0 1px 0 oklch(1 0 0 / 5%)",
        }}
        type="button"
      >
        <span className="flex items-center gap-1">
          <Coins
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110"
            style={{ color: "oklch(0.82 0.14 85)" }}
          />
          <span
            className="font-semibold text-xs tabular-nums"
            style={{ color: "oklch(0.92 0.03 85)" }}
          >
            {formatted} MISHA
          </span>
        </span>
        {showCmisha && (
          <>
            <span
              className="text-xs"
              style={{ color: "oklch(0.5 0 270 / 50%)" }}
            >
              |
            </span>
            {cmishaFormatted != null ? (
              <span
                className="font-semibold text-xs tabular-nums"
                style={{ color: "oklch(0.85 0.12 180)" }}
              >
                {cmishaFormatted} cMISHA
              </span>
            ) : (
              <button
                className="flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  decrypt();
                }}
                type="button"
              >
                {isDecrypting ? (
                  <Loader2
                    className="h-3 w-3 animate-spin"
                    style={{ color: "oklch(0.7 0.1 180)" }}
                  />
                ) : (
                  <Lock
                    className="h-3 w-3 transition-colors hover:opacity-80"
                    style={{ color: "oklch(0.7 0.1 180)" }}
                  />
                )}
              </button>
            )}
          </>
        )}
      </button>

      {isMobile ? (
        <Drawer direction="bottom" onOpenChange={setOpen} open={open}>
          <DrawerContent
            className="rounded-t-3xl"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.12 0.03 280 / 98%) 0%, oklch(0.08 0.02 270 / 98%) 100%)",
              boxShadow: "0 -4px 30px oklch(0.08 0.02 270 / 60%)",
            }}
          >
            <div className="p-6">
              <RewardsHeader />
            </div>
            <div
              className="overflow-y-auto px-6 pb-6"
              style={{ maxHeight: "calc(80vh - 120px)" }}
            >
              <RewardsContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle asChild>
                <RewardsHeader />
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <RewardsContent />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

export { PointsDisplay as BalanceDisplay };
