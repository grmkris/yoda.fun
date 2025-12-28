"use client";

import Image from "next/image";
import { SidebarTrigger } from "./sidebar/sidebar-trigger";

export default function Header() {
  return (
    <header
      className="sticky top-0 z-40 lg:hidden"
      style={{
        background: "oklch(0.08 0.02 270 / 80%)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid oklch(0.65 0.25 290 / 15%)",
      }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* Hamburger menu (mobile only) */}
        <SidebarTrigger />

        {/* Logo */}
        <Image
          alt="yoda.fun"
          className="h-8 w-8"
          height={32}
          src="/favicon/logo.png"
          width={32}
        />

        {/* Spacer for symmetry */}
        <div className="w-10" />
      </div>
    </header>
  );
}
