"use client";

import { Loader2, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { useAccount } from "wagmi";
import { PortoConnectButton } from "@/components/porto-connect-button";
import { Button } from "@/components/ui/button";
import { env } from "@/env";
import {
  DEPOSIT_TIERS,
  type DepositTier,
  useCanDeposit,
  useDeposit,
  useDevDeposit,
} from "@/hooks/use-deposit";

function TierButton({
  amount,
  isLoading,
  onSelect,
}: {
  amount: DepositTier;
  isLoading: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className="group relative overflow-hidden rounded-xl p-4 text-center transition-all hover:scale-105"
      disabled={isLoading}
      onClick={onSelect}
      style={{
        background: "oklch(0.08 0.02 270 / 50%)",
        border: "1px solid oklch(0.65 0.25 290 / 20%)",
      }}
      type="button"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "oklch(0.72 0.18 175 / 10%)" }}
      />
      <div
        className="relative mb-2 font-bold font-heading text-2xl"
        style={{ color: "oklch(0.95 0.02 280)" }}
      >
        ${amount}
      </div>
      <div
        className="relative flex items-center justify-center gap-1 font-medium text-sm"
        style={{ color: "oklch(0.72 0.18 175)" }}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4" />
            Deposit
          </>
        )}
      </div>
    </button>
  );
}

function DevDepositButtons() {
  const devDeposit = useDevDeposit();
  const { isPending } = devDeposit;

  if (env.NEXT_PUBLIC_ENV !== "dev") {
    return null;
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "oklch(0.80 0.16 90 / 10%)",
        border: "1px solid oklch(0.80 0.16 90 / 30%)",
      }}
    >
      <div
        className="mb-3 font-heading font-medium text-sm"
        style={{ color: "oklch(0.80 0.16 90)" }}
      >
        Dev Deposit (No Payment)
      </div>
      <div className="flex flex-wrap gap-2">
        {DEPOSIT_TIERS.map((tier) => (
          <Button
            disabled={isPending}
            key={tier}
            onClick={() => devDeposit.mutate(tier)}
            size="sm"
            variant="outline"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              `+$${tier}`
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function DepositSection() {
  const { isConnected } = useAccount();
  const canDeposit = useCanDeposit();
  const deposit = useDeposit();
  const { isPending, variables: pendingTier } = deposit;

  const handleDeposit = (tier: DepositTier) => {
    deposit.mutate(tier);
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      transition={{ delay: 0.35, duration: 0.5 }}
    >
      <h2
        className="flex items-center gap-2 font-heading font-semibold text-lg"
        style={{ color: "oklch(0.95 0.02 280)" }}
      >
        <Wallet className="h-5 w-5" style={{ color: "oklch(0.72 0.18 175)" }} />
        Deposit
      </h2>

      <DevDepositButtons />

      {isConnected && canDeposit ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DEPOSIT_TIERS.map((tier) => (
            <TierButton
              amount={tier}
              isLoading={isPending === true && pendingTier === tier}
              key={tier}
              onSelect={() => handleDeposit(tier)}
            />
          ))}
        </div>
      ) : (
        <div
          className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-6 text-center"
          style={{ borderColor: "oklch(0.65 0.25 290 / 30%)" }}
        >
          <Wallet
            className="h-10 w-10"
            style={{ color: "oklch(0.65 0.04 280)" }}
          />
          <div>
            <div
              className="mb-1 font-heading font-semibold"
              style={{ color: "oklch(0.90 0.02 280)" }}
            >
              Connect Your Wallet
            </div>
            <div className="text-sm" style={{ color: "oklch(0.60 0.04 280)" }}>
              Connect your wallet to deposit funds
            </div>
          </div>
          <PortoConnectButton />
        </div>
      )}
    </motion.div>
  );
}
