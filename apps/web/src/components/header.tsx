"use client";

import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PointsDisplay } from "@/components/balance-display";
import { authClient } from "@/lib/auth-client";
import { SidebarTrigger } from "./sidebar/sidebar-trigger";

export default function Header() {
  const { data: session } = authClient.useSession();

  return (
    <header
      className="sticky top-0 z-40 lg:hidden"
      style={{
        background: "oklch(0.08 0.02 270 / 80%)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid oklch(0.65 0.25 290 / 15%)",
      }}
    >
      <div className="flex h-14 items-center justify-between px-3">
        {/* Left: Hamburger menu */}
        <SidebarTrigger />

        {/* Center: Logo */}
        <Link className="absolute left-1/2 -translate-x-1/2" href="/">
          <Image
            alt="yoda.fun"
            className="h-8 w-8"
            height={32}
            src="/favicon/logo.png"
            width={32}
          />
        </Link>

        {/* Right: Points + Profile */}
        <div className="flex items-center gap-2">
          {session && <PointsDisplay />}
          <Link
            className="flex h-8 w-8 items-center justify-center"
            href={session ? "/profile" : "/login"}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                background: session
                  ? "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))"
                  : "oklch(0.25 0.02 270)",
              }}
            >
              <User className="h-3.5 w-3.5 text-white" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
