"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { PointsDisplay } from "@/components/balance-display";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

export function TopBar() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <header
      className="sticky top-0 z-40 hidden lg:block"
      style={{
        background: "oklch(0.08 0.02 270 / 80%)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid oklch(0.65 0.25 290 / 15%)",
      }}
    >
      <div className="flex h-14 items-center justify-end gap-3 px-6">
        <PointsDisplay />

        {isPending && <Skeleton className="h-8 w-24" />}
        {!isPending && session?.user && (
          <Link
            className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 transition-colors hover:bg-muted/80"
            href="/profile"
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
              }}
            >
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-medium text-sm">{session.user.name}</span>
          </Link>
        )}
        {!(isPending || session?.user) && (
          <Link
            className="flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90"
            href="/login"
          >
            <span className="font-medium text-sm">Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
