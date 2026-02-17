"use client";

import {
  confidentialMishaAbi,
  mishaTokenAbi,
  encryptAmount,
} from "@yoda.fun/fhevm/sdk";
import { useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { bytesToHex, parseEther } from "viem";
import { useFhevm } from "@/components/fhevm-provider";
import { Button } from "@/components/ui/button";
import { useMishaBalance } from "@/hooks/use-misha-balance";

type Mode = "wrap" | "unwrap";

export function WrapUnwrap() {
  const [mode, setMode] = useState<Mode>("wrap");
  const [amount, setAmount] = useState("");
  const { address, isConnected } = useAccount();
  const { instance, contracts } = useFhevm();
  const mishaBalance = useMishaBalance();

  // Step 1: Approve MISHA spending (for wrap)
  const approve = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({
    hash: approve.data,
  });

  // Step 2: Wrap or Unwrap (step 1 of unwrap)
  const action = useWriteContract();
  const actionReceipt = useWaitForTransactionReceipt({
    hash: action.data,
  });

  if (!isConnected || !address) {
    return null;
  }

  // For wrap: amount is in MISHA wei (parseEther)
  // For unwrap: amount is in cMISHA whole units, encrypted client-side
  const parsedWrapAmount = amount ? parseEther(amount) : BigInt(0);
  const isPending =
    approve.isPending ||
    approveReceipt.isLoading ||
    action.isPending ||
    actionReceipt.isLoading;

  const handleWrap = () => {
    if (!address || !parsedWrapAmount) return;

    // Approve cMISHA contract to spend MISHA (amount in wei)
    approve.writeContract({
      address: contracts.mishaToken,
      abi: mishaTokenAbi,
      functionName: "approve",
      args: [contracts.confidentialMisha, parsedWrapAmount],
    });
  };

  const handleUnwrap = async () => {
    if (!instance || !address || !amount) return;

    // Encrypt the unwrap amount (in 6-decimal cMISHA units)
    const unwrapUnits = Number(amount) * 1e6;
    const encrypted = await encryptAmount(
      instance,
      contracts.confidentialMisha,
      address,
      unwrapUnits
    );

    // Step 1: unwrap(from, to, encryptedAmount, inputProof)
    // This burns cMISHA and emits UnwrapRequested
    // User must then call publicDecrypt + finalizeUnwrap off-chain
    action.writeContract({
      address: contracts.confidentialMisha,
      abi: confidentialMishaAbi,
      functionName: "unwrap",
      args: [
        address,
        address,
        bytesToHex(encrypted.encryptedAmount),
        bytesToHex(encrypted.inputProof),
      ],
    });
  };

  // After approval succeeds, trigger the wrap with wrap(to, amount)
  if (mode === "wrap" && approveReceipt.isSuccess && !action.data) {
    action.writeContract({
      address: contracts.confidentialMisha,
      abi: confidentialMishaAbi,
      functionName: "wrap",
      args: [address, parsedWrapAmount],
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

      <div className="text-muted-foreground text-xs">
        {mode === "wrap"
          ? "1 MISHA wraps to 1 cMISHA (rate: 1e12)"
          : "Unwrap is two-step: submit → finalize after decryption"}
      </div>

      <div className="flex gap-2">
        <input
          className="bg-input h-9 flex-1 rounded-md border px-3 text-sm"
          disabled={isPending}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={mode === "wrap" ? "MISHA amount" : "cMISHA amount"}
          type="number"
          value={amount}
        />
        <Button
          disabled={isPending || !amount || (mode === "wrap" && parsedWrapAmount === BigInt(0))}
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
          {mode === "wrap"
            ? "Wrapped successfully!"
            : "Unwrap requested! Finalization pending after decryption."}
        </p>
      )}
    </div>
  );
}
