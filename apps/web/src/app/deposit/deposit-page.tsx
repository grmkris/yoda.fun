"use client";

import { Loader2, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { PortoConnectButton } from "@/components/porto-connect-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/env";
import { useBalance } from "@/hooks/use-balance";
import {
  DEPOSIT_TIERS,
  type DepositTier,
  useCanDeposit,
  useDeposit,
  useDevDeposit,
} from "@/hooks/use-deposit";

function TierCard({
  amount,
  isLoading,
  onSelect,
}: {
  amount: DepositTier;
  isLoading: boolean;
  onSelect: () => void;
}) {
  return (
    <Card className="transition-all hover:border-primary/50 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-3xl">${amount}</CardTitle>
        <CardDescription>USDC</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          disabled={isLoading}
          onClick={onSelect}
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wallet />
              Deposit ${amount}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function BalanceCard() {
  const { data: balance, isLoading } = useBalance();
  const available = Number(balance?.available ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium text-muted-foreground text-sm">
          Current Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-32" />
        ) : (
          <p className="font-bold text-4xl">${available.toFixed(2)}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectWalletPrompt() {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <Wallet className="mx-auto size-12 text-muted-foreground" />
        <CardTitle>Connect Your Wallet</CardTitle>
        <CardDescription>
          Connect your wallet to deposit funds and start betting
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <PortoConnectButton size="lg" />
      </CardContent>
    </Card>
  );
}

function DepositTiers() {
  const deposit = useDeposit();
  const { isPending, variables: pendingTier } = deposit;

  const handleDeposit = (tier: DepositTier) => {
    deposit.mutate(tier);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {DEPOSIT_TIERS.map((tier) => (
        <TierCard
          amount={tier}
          isLoading={isPending === true && pendingTier === tier}
          key={tier}
          onSelect={() => handleDeposit(tier)}
        />
      ))}
    </div>
  );
}

function DevDepositSection() {
  const devDeposit = useDevDeposit();
  const { isPending } = devDeposit;

  if (env.NEXT_PUBLIC_ENV !== "dev") {
    return null;
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="text-yellow-600">
          Dev Deposit (No Payment)
        </CardTitle>
        <CardDescription>
          Bypass x402 payment for testing - only available in development
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {DEPOSIT_TIERS.map((tier) => (
            <Button
              className="border-yellow-500/50"
              disabled={isPending}
              key={tier}
              onClick={() => devDeposit.mutate(tier)}
              variant="outline"
            >
              {isPending ? <Loader2 className="animate-spin" /> : `+$${tier}`}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DepositPage() {
  const { isConnected } = useAccount();
  const canDeposit = useCanDeposit();

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-4">
      {/* Current Balance */}
      <BalanceCard />

      {/* Dev Deposit (only in development) */}
      <DevDepositSection />

      {/* Deposit Options or Connect Prompt */}
      {isConnected === true && canDeposit === true ? (
        <div className="space-y-4">
          <h2 className="font-semibold text-xl">Select Amount</h2>
          <DepositTiers />
          <p className="text-center text-muted-foreground text-sm">
            Deposits are processed instantly via the x402 payment protocol
          </p>
        </div>
      ) : (
        <ConnectWalletPrompt />
      )}
    </div>
  );
}
