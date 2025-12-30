"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();

  if (!card) {
    return null;
  }

  // Mobile: bottom drawer, Desktop: right sheet (like sidebar)
  return isMobile ? (
    <Drawer onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DrawerContent className="max-h-[85vh] border-0">
        <DrawerHeader className="pb-0">
          <DrawerTitle className="text-left">{card.title}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto">
          <GameCardBack
            card={card}
            inSheet
            onSkip={onSkip}
            onVoteNo={onVoteNo}
            onVoteYes={onVoteYes}
          />
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent className="p-0" side="right">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="pr-8">{card.title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <GameCardBack
            card={card}
            inSheet
            onSkip={onSkip}
            onVoteNo={onVoteNo}
            onVoteYes={onVoteYes}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
