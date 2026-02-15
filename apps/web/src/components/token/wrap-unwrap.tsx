"use client";

import {
  confidentialMishaAbi,
  mishaTokenAbi,
} from "@yoda.fun/fhevm/sdk";
import { useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { parseEther } from "viem";
import { useFhevm } from "@/components/fhevm-provider";
import { Button } from "@/components/ui/button";
import { useMishaBalance } from "@/hooks/use-misha-balance";

type Mode = "wrap" | "unwrap";

export function WrapUnwrap() {
  const [mode, setMode] = useState<Mode>("wrap");
  const [amount, setAmount] = useState("");
  const { address, isConnected } = useAccount();
  const { contracts } = useFhevm();
  const mishaBalance = useMishaBalance();

  // Step 1: Approve MISHA spending (for wrap)
  const approve = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({
    hash: approve.data,
  });

  // Step 2: Wrap or Unwrap
  const action = useWriteContract();
  const actionReceipt = useWaitForTransactionReceipt({
    hash: action.data,
  });

  if (!isConnected) {
    return null;
  }

  const parsedAmount = amount ? parseEther(amount) : BigInt(0);
  const isPending =
    approve.isPending ||
    approveReceipt.isLoading ||
    action.isPending ||
    actionReceipt.isLoading;

  const handleWrap = async () => {
    if (!address || !parsedAmount) return;

    // Approve cMISHA contract to spend MISHA
    approve.writeContract({
      address: contracts.mishaToken,
      abi: mishaTokenAbi,
      functionName: "approve",
      args: [contracts.confidentialMisha, parsedAmount],
    });
  };

  const handleUnwrap = async () => {
    if (!parsedAmount) return;

    action.writeContract({
      address: contracts.confidentialMisha,
      abi: confidentialMishaAbi,
      functionName: "unwrap",
      args: [parsedAmount],
    });
  };

  // After approval succeeds, trigger the wrap
  if (mode === "wrap" && approveReceipt.isSuccess && !action.data) {
    action.writeContract({
      address: contracts.confidentialMisha,
      abi: confidentialMishaAbi,
      functionName: "wrap",
      args: [parsedAmount],
    });
  }

  const handleSubmit = () => {
    if (mode === "wrap") {
      handleWrap();
    } else {
      handleUnwrap();
    }
  };

  const formatBalance = (value: bigint | undefined) => {
    if (value === undefined) return "—";
    return (Number(value) / 1e18).toFixed(2);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          onClick={() => setMode("wrap")}
          size="sm"
          variant={mode === "wrap" ? "default" : "outline"}
        >
          Wrap
        </Button>
        <Button
          onClick={() => setMode("unwrap")}
          size="sm"
          variant={mode === "unwrap" ? "default" : "outline"}
        >
          Unwrap
        </Button>
      </div>

      <div className="text-muted-foreground text-sm">
        MISHA Balance: {formatBalance(mishaBalance.data as bigint | undefined)}
      </div>

      <div className="flex gap-2">
        <input
          className="bg-input h-9 flex-1 rounded-md border px-3 text-sm"
          disabled={isPending}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          type="number"
          value={amount}
        />
        <Button
          disabled={isPending || !amount || parsedAmount === BigInt(0)}
          onClick={handleSubmit}
          size="sm"
        >
          {isPending
            ? "Processing..."
            : mode === "wrap"
              ? "Wrap → cMISHA"
              : "Unwrap → MISHA"}
        </Button>
      </div>

      {actionReceipt.isSuccess && (
        <p className="text-sm text-green-500">
          {mode === "wrap" ? "Wrapped" : "Unwrapped"} successfully!
        </p>
      )}
    </div>
  );
}
