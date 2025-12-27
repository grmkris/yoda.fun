"use client";

import { Check, Copy, Link, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplyReferralCode, useRewardSummary } from "@/hooks/use-rewards";

export function ReferralCard() {
  const { data, isLoading } = useRewardSummary();
  const applyCodeMutation = useApplyReferralCode();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inputCode, setInputCode] = useState("");

  const referral = data?.referral;
  const code = referral?.code ?? "";
  const count = referral?.count ?? 0;
  const earnings = referral?.earnings ?? 0;

  const inviteUrl =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/invite/${code}`
      : "";

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleApplyCode = () => {
    if (inputCode.trim()) {
      applyCodeMutation.mutate(inputCode.trim());
      setInputCode("");
    }
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      style={{
        background: "oklch(0.10 0.03 280 / 60%)",
        backdropFilter: "blur(20px)",
        border: "1px solid oklch(0.65 0.25 290 / 20%)",
        boxShadow: `
          0 0 60px oklch(0.65 0.25 290 / 10%),
          inset 0 1px 0 oklch(1 0 0 / 8%)
        `,
      }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Background effect */}
      <div
        className="pointer-events-none absolute -right-20 -bottom-20 h-60 w-60 rounded-full blur-3xl"
        style={{ background: "oklch(0.65 0.25 290 / 15%)" }}
      />

      {/* Header */}
      <div className="relative mb-6 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.65 0.25 290), oklch(0.55 0.25 310))",
            boxShadow: "0 0 20px oklch(0.65 0.25 290 / 30%)",
          }}
        >
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3
            className="font-heading font-semibold text-lg"
            style={{ color: "oklch(0.95 0.02 280)" }}
          >
            Refer Friends
          </h3>
          <p className="text-sm" style={{ color: "oklch(0.65 0.04 280)" }}>
            Earn $5 for each friend who bets
          </p>
        </div>
      </div>

      {/* Your referral code */}
      <div className="relative mb-4">
        <span
          className="mb-2 block font-medium text-sm"
          style={{ color: "oklch(0.75 0.04 280)" }}
        >
          Your referral code
        </span>
        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <div className="flex gap-2">
            <div
              className="flex flex-1 items-center rounded-lg px-4 py-3 font-bold font-mono tracking-wider"
              style={{
                background: "oklch(0.08 0.02 270 / 80%)",
                border: "1px solid oklch(0.65 0.25 290 / 20%)",
                color: "oklch(0.95 0.02 280)",
              }}
            >
              {code}
            </div>
            <Button
              className="shrink-0"
              onClick={handleCopyCode}
              size="icon"
              style={{
                background: copiedCode
                  ? "oklch(0.72 0.18 175)"
                  : "oklch(0.20 0.04 280)",
                border: "1px solid oklch(0.65 0.25 290 / 20%)",
              }}
              title="Copy code"
              variant="outline"
            >
              {copiedCode ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              className="shrink-0"
              onClick={handleCopyLink}
              size="icon"
              style={{
                background: copiedLink
                  ? "oklch(0.72 0.18 175)"
                  : "oklch(0.20 0.04 280)",
                border: "1px solid oklch(0.65 0.25 290 / 20%)",
              }}
              title="Copy invite link"
              variant="outline"
            >
              {copiedLink ? (
                <Check className="h-4 w-4" />
              ) : (
                <Link className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div
        className="mb-6 grid grid-cols-2 gap-3 rounded-xl p-3"
        style={{
          background: "oklch(0.08 0.02 270 / 50%)",
          border: "1px solid oklch(0.65 0.25 290 / 10%)",
        }}
      >
        <div className="text-center">
          <div
            className="font-bold text-2xl"
            style={{ color: "oklch(0.65 0.25 290)" }}
          >
            {count}
          </div>
          <div className="text-xs" style={{ color: "oklch(0.65 0.04 280)" }}>
            Friends invited
          </div>
        </div>
        <div className="text-center">
          <div
            className="font-bold text-2xl"
            style={{ color: "oklch(0.72 0.18 175)" }}
          >
            ${earnings.toFixed(2)}
          </div>
          <div className="text-xs" style={{ color: "oklch(0.65 0.04 280)" }}>
            Total earned
          </div>
        </div>
      </div>

      {/* Apply a code */}
      <div>
        <span
          className="mb-2 block font-medium text-sm"
          style={{ color: "oklch(0.75 0.04 280)" }}
        >
          Have a referral code?
        </span>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            style={{
              background: "oklch(0.08 0.02 270 / 80%)",
              border: "1px solid oklch(0.65 0.25 290 / 20%)",
            }}
            value={inputCode}
          />
          <Button
            disabled={!inputCode.trim() || applyCodeMutation.isPending}
            onClick={handleApplyCode}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.25 290), oklch(0.55 0.25 310))",
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
