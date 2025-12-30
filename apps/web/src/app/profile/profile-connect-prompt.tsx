"use client";

import { AppKitButton } from "@reown/appkit/react";
import { TrendingUp, Trophy, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAuthenticated } from "@/hooks/use-wallet";

function PromptCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center p-4">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        style={{
          background: "oklch(0.10 0.03 280 / 60%)",
          backdropFilter: "blur(20px)",
          border: "1px solid oklch(0.65 0.25 290 / 20%)",
          boxShadow: "0 0 60px oklch(0.65 0.25 290 / 15%)",
        }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl"
          style={{ background: "oklch(0.65 0.25 290 / 20%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full blur-3xl"
          style={{ background: "oklch(0.72 0.18 175 / 15%)" }}
        />

        <div className="relative">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
              boxShadow: "0 0 40px oklch(0.65 0.25 290 / 40%)",
            }}
          >
            <Wallet className="h-10 w-10 text-white" />
          </div>

          <h1
            className="mb-2 font-bold font-heading text-2xl"
            style={{ color: "oklch(0.95 0.02 280)" }}
          >
            {title}
          </h1>

          <p className="mb-6 text-sm" style={{ color: "oklch(0.65 0.04 280)" }}>
            {subtitle}
          </p>

          <div
            className="mb-6 space-y-2 rounded-xl p-4 text-left"
            style={{
              background: "oklch(0.08 0.02 270 / 50%)",
              border: "1px solid oklch(0.65 0.25 290 / 10%)",
            }}
          >
            <Feature
              icon={<Wallet className="h-4 w-4" />}
              text="View balance & deposit history"
            />
            <Feature
              icon={<TrendingUp className="h-4 w-4" />}
              text="Track your betting performance"
            />
            <Feature
              icon={<Trophy className="h-4 w-4" />}
              text="See your leaderboard ranking"
            />
          </div>

          {children}
        </div>
      </motion.div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div style={{ color: "oklch(0.72 0.18 175)" }}>{icon}</div>
      <span className="text-sm" style={{ color: "oklch(0.85 0.02 280)" }}>
        {text}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <Skeleton className="mx-auto h-20 w-20 rounded-2xl" />
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
        <Skeleton className="mx-auto h-32 w-full rounded-xl" />
        <Skeleton className="mx-auto h-10 w-40" />
      </div>
    </div>
  );
}

export function ProfileConnectPrompt() {
  const { isAnonymous, isLoading } = useIsAuthenticated();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!isAnonymous) {
    return null;
  }

  return (
    <PromptCard
      subtitle="Connect your wallet to view your profile and unlock all features"
      title="Connect Your Wallet"
    >
      <AppKitButton />
    </PromptCard>
  );
}
