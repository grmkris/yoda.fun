"use client";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { MarketCard } from "./card-front";
import { GameCardBack } from "./game-card-back";

interface CardDetailsSheetProps {
  card: MarketCard | null;
  isOpen: boolean;
  onClose: () => void;
  onVoteYes: () => void;
  onVoteNo: () => void;
  onSkip: () => void;
}

export function CardDetailsSheet({
  card,
  isOpen,
  onClose,
  onVoteYes,
  onVoteNo,
  onSkip,
}: CardDetailsSheetProps) {
  if (!card) {
    return null;
  }

  return (
    <Drawer
      direction="bottom"
      onOpenChange={(open) => !open && onClose()}
      open={isOpen}
    >
      <DrawerContent
        className="rounded-t-3xl"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.12 0.03 280 / 98%) 0%, oklch(0.08 0.02 270 / 98%) 100%)",
          boxShadow: "0 -4px 30px oklch(0.08 0.02 270 / 60%)",
        }}
      >
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(80vh - 40px)" }}
        >
          <GameCardBack
            card={card}
            onClose={onClose}
            onSkip={onSkip}
            onVoteNo={onVoteNo}
            onVoteYes={onVoteYes}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
