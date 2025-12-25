"use client";

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
        <div
          className="font-bold font-heading text-xl tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          yoda.fun
        </div>

        {/* Spacer for symmetry */}
        <div className="w-10" />
      </div>
    </header>
  );
}
