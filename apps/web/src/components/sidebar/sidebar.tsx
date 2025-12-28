"use client";

import { Home, Trophy } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

// ─────────────────────────────────────────────────────────────
// Navigation Items
// ─────────────────────────────────────────────────────────────
const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
] as const;

// ─────────────────────────────────────────────────────────────
// Sidebar Nav Item
// ─────────────────────────────────────────────────────────────
interface NavItemProps {
  to: string;
  label: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  onClick?: () => void;
}

function SidebarNavItem({ to, label, icon: Icon, onClick }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === to;

  return (
    <Link
      className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-heading font-medium text-sm transition-all duration-200"
      href={to as "/"}
      onClick={onClick}
      style={{
        color: isActive ? "oklch(0.95 0.02 280)" : "oklch(0.65 0.04 280)",
        background: isActive ? "oklch(0.65 0.25 290 / 15%)" : "transparent",
      }}
    >
      {/* Active indicator glow */}
      {isActive && (
        <motion.span
          className="absolute inset-0 rounded-xl"
          layoutId="sidebar-active-indicator"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 175 / 10%), oklch(0.65 0.25 290 / 10%))",
            boxShadow: "0 0 20px oklch(0.65 0.25 290 / 15%)",
          }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}

      <Icon
        className="relative z-10 h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{
          color: isActive ? "oklch(0.72 0.18 175)" : undefined,
        }}
      />

      <span className="relative z-10 truncate">{label}</span>

      {/* Hover glow effect */}
      <span
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: "oklch(0.65 0.25 290 / 8%)",
        }}
      />
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// Desktop Sidebar (always expanded, no collapse)
// ─────────────────────────────────────────────────────────────
function DesktopSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "relative flex h-full w-52 shrink-0 flex-col overflow-hidden",
        className
      )}
      style={{
        background: "oklch(0.08 0.02 270 / 80%)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid oklch(0.65 0.25 290 / 15%)",
      }}
    >
      {/* Header with logo */}
      <div
        className="flex h-14 shrink-0 items-center px-4"
        style={{
          borderBottom: "1px solid oklch(0.65 0.25 290 / 10%)",
        }}
      >
        <Link href="/">
          <Image
            alt="yoda.fun"
            className="h-9 w-9"
            height={36}
            src="/favicon/logo.png"
            width={36}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {navItems.map((item) => (
          <SidebarNavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute top-1/3 -left-20 h-40 w-40 rounded-full blur-3xl"
        style={{
          background: "oklch(0.65 0.25 290 / 8%)",
        }}
      />
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Mobile Sidebar (Sheet)
// ─────────────────────────────────────────────────────────────
function MobileSidebar() {
  const { isOpen, setOpen } = useSidebar();

  return (
    <Sheet onOpenChange={setOpen} open={isOpen}>
      <SheetContent className="p-0" side="left">
        {/* Header with logo */}
        <div
          className="flex h-14 shrink-0 items-center px-4"
          style={{
            borderBottom: "1px solid oklch(0.65 0.25 290 / 10%)",
          }}
        >
          <Link href="/" onClick={() => setOpen(false)}>
            <Image
              alt="yoda.fun"
              className="h-9 w-9"
              height={36}
              src="/favicon/logo.png"
              width={36}
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.to}
              {...item}
              onClick={() => setOpen(false)}
            />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// App Sidebar (combines both)
// ─────────────────────────────────────────────────────────────
function AppSidebar() {
  return (
    <>
      <DesktopSidebar className="hidden lg:flex" />
      <MobileSidebar />
    </>
  );
}

export { AppSidebar, DesktopSidebar, MobileSidebar };
