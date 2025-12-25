"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";

export function SidebarTrigger({ className }: { className?: string }) {
  const { setOpen } = useSidebar();

  return (
    <button
      aria-label="Open menu"
      className={className}
      onClick={() => setOpen(true)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "40px",
        height: "40px",
        borderRadius: "10px",
        color: "oklch(0.65 0.04 280)",
        background: "transparent",
        transition: "all 0.2s",
      }}
      type="button"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
