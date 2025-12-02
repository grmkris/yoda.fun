"use client";

import { Loader2, Wallet } from "lucide-react";
import Link from "next/link";
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
import {
  DEPOSIT_TIERS,
  type DepositTier,
  useBalance,
  useCanDeposit,
  useDeposit,
} from "@/hooks";

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
          isLoading={isPending && pendingTier === tier}
          key={tier}
          onSelect={() => handleDeposit(tier)}
        />
      ))}
    </div>
  );
}

export function DepositPage() {
  const { isConnected } = useAccount();
  const canDeposit = useCanDeposit();

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-bold text-3xl">Deposit Funds</h1>
        <p className="text-muted-foreground">
          Add funds to your account using USDC on Base network
        </p>
      </div>

      {/* Current Balance */}
      <BalanceCard />

      {/* Deposit Options or Connect Prompt */}
      {isConnected && canDeposit ? (
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

      {/* Back Link */}
      <div className="pt-4 text-center">
        <Link
          className="text-primary text-sm hover:underline"
          href="/dashboard"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
