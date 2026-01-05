"use client";

import type { MarketId } from "@yoda.fun/shared/typeid";
import { useEffect, useState } from "react";
import { baseSepolia } from "viem/chains";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useAgentProfile } from "@/hooks/use-agent";
import {
  type FeedbackType,
  useGetFeedbackAuth,
  useRecordFeedback,
} from "@/hooks/use-feedback";
import {
  ERC8004_CONTRACTS,
  FEEDBACK_TAGS,
  REPUTATION_REGISTRY_ABI,
  ZERO_BYTES32,
} from "@/lib/erc8004/contracts";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  marketId: MarketId;
  marketTitle: string;
  feedbackType: FeedbackType;
}

export function FeedbackModal({
  open,
  onClose,
  marketId,
  marketTitle,
  feedbackType,
}: FeedbackModalProps) {
  const [score, setScore] = useState(0);
  const [step, setStep] = useState<"rate" | "sign" | "confirm" | "done">(
    "rate"
  );

  const { address, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: agentProfile } = useAgentProfile();

  const getFeedbackAuth = useGetFeedbackAuth();
  const recordFeedback = useRecordFeedback();

  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Reset on close
  useEffect(() => {
    if (!open) {
      setScore(0);
      setStep("rate");
      resetWrite();
    }
  }, [open, resetWrite]);

  // Record feedback after confirmation
  useEffect(() => {
    if (isSuccess && txHash) {
      recordFeedback.mutate({
        marketId,
        feedbackType,
        score,
        txHash,
      });
      setStep("done");
    }
  }, [isSuccess, txHash, marketId, feedbackType, score, recordFeedback]);

  const isOnBaseSepolia = chainId === baseSepolia.id;

  const handleSwitchNetwork = async () => {
    await switchChain({ chainId: baseSepolia.id });
  };

  const handleSubmit = async () => {
    if (!address || score === 0 || !agentProfile) {
      return;
    }

    setStep("sign");

    try {
      // Get feedback authorization from backend
      const authData = await getFeedbackAuth.mutateAsync({
        marketId,
        feedbackType,
      });

      // Convert 1-5 score to 0-100 for on-chain
      const onChainScore = Math.round(score * 20);
      const tag1 =
        feedbackType === "RESOLUTION"
          ? FEEDBACK_TAGS.RESOLUTION
          : FEEDBACK_TAGS.QUALITY;

      setStep("confirm");

      // Submit on-chain transaction
      writeContract({
        address: ERC8004_CONTRACTS.reputationRegistry,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "giveFeedback",
        args: [
          BigInt(authData.agentId),
          onChainScore,
          tag1,
          ZERO_BYTES32, // tag2 empty
          "", // feedbackUri empty
          ZERO_BYTES32, // feedbackHash empty
          authData.auth as `0x${string}`,
        ],
      });
    } catch {
      setStep("rate");
    }
  };

  const typeLabel =
    feedbackType === "RESOLUTION" ? "Resolution Accuracy" : "Market Quality";

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {typeLabel}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {marketTitle}
          </DialogDescription>
        </DialogHeader>

        {step === "rate" && (
          <div className="space-y-6">
            {/* Star Rating */}
            <div className="flex justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  className={`text-4xl transition-colors hover:scale-110 ${
                    score >= value ? "text-yellow-400" : "text-gray-300"
                  }`}
                  key={value}
                  onClick={() => setScore(value)}
                  type="button"
                >
                  ★
                </button>
              ))}
            </div>

            {/* Score Label */}
            <p className="text-center text-muted-foreground text-sm">
              {score === 0 && "Select a rating"}
              {score === 1 && "Poor"}
              {score === 2 && "Fair"}
              {score === 3 && "Good"}
              {score === 4 && "Great"}
              {score === 5 && "Excellent"}
            </p>

            {/* Network Warning */}
            {!isOnBaseSepolia && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-center text-sm">
                <p className="text-yellow-600 dark:text-yellow-400">
                  Feedback is submitted on Base Sepolia testnet.
                </p>
                <Button
                  className="mt-2"
                  disabled={isSwitching}
                  onClick={handleSwitchNetwork}
                  size="sm"
                  variant="outline"
                >
                  {isSwitching ? "Switching..." : "Switch to Base Sepolia"}
                </Button>
              </div>
            )}

            {/* Submit Button */}
            <Button
              className="w-full"
              disabled={
                score === 0 || !isOnBaseSepolia || getFeedbackAuth.isPending
              }
              onClick={handleSubmit}
            >
              Submit Feedback
            </Button>

            {writeError && (
              <p className="text-center text-red-500 text-sm">
                Error: {writeError.message}
              </p>
            )}
          </div>
        )}

        {step === "sign" && (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Getting authorization...</p>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">
              {isWriting && "Please confirm in your wallet..."}
              {isConfirming && "Confirming transaction..."}
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <span className="text-3xl">✓</span>
            </div>
            <p className="font-medium">Feedback Submitted!</p>
            <p className="text-muted-foreground text-sm">
              Your rating has been recorded on-chain.
            </p>
            {txHash && (
              <a
                className="text-primary text-sm hover:underline"
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                View transaction
              </a>
            )}
            <Button className="mt-4" onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
