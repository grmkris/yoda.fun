"use client";

import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useFaucet } from "@/hooks/use-faucet";

export function FaucetButton() {
  const { isConnected } = useAccount();
  const faucet = useFaucet();

  if (!isConnected) {
    return null;
  }

  return (
    <Button
      disabled={faucet.isPending}
      onClick={() => faucet.mutate()}
      size="sm"
      variant="outline"
    >
      {faucet.isPending ? "Minting..." : "Get Test MISHA"}
    </Button>
  );
}
