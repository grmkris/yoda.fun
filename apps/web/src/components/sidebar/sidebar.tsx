"use client";

import {
  Home,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  Ticket,
  Trophy,
  User,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

// ─────────────────────────────────────────────────────────────
// Navigation Items
// ─────────────────────────────────────────────────────────────
const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bets", label: "My Bets", icon: Ticket },
  { to: "/deposit", label: "Deposit", icon: Wallet },
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
  isCollapsed: boolean;
  onClick?: () => void;
}

function SidebarNavItem({
  to,
  label,
  icon: Icon,
  isCollapsed,
  onClick,
}: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === to;

  return (
    <Link
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-heading font-medium text-sm transition-all duration-200",
        isCollapsed && "justify-center px-2"
      )}
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
        className={cn(
          "relative z-10 h-5 w-5 shrink-0 transition-transform duration-200",
          !isCollapsed && "group-hover:scale-110"
        )}
        style={{
          color: isActive ? "oklch(0.72 0.18 175)" : undefined,
        }}
      />

      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            animate={{ opacity: 1, width: "auto" }}
            className="relative z-10 truncate"
            exit={{ opacity: 0, width: 0 }}
            initial={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

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
// User Section
// ─────────────────────────────────────────────────────────────
function SidebarUser({ isCollapsed }: { isCollapsed: boolean }) {
  const router = useRouter();
  const { session, isPending } = useSession();

  if (isPending) {
    return (
      <div
        className={cn("flex items-center gap-3 px-3", isCollapsed && "px-2")}
      >
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        {!isCollapsed && <Skeleton className="h-4 w-20" />}
      </div>
    );
  }

  if (!session) {
    return (
      <Link
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-heading font-medium text-sm transition-all duration-200",
          isCollapsed && "justify-center px-2"
        )}
        href="/login"
        style={{
          color: "oklch(0.72 0.18 175)",
          background: "oklch(0.72 0.18 175 / 10%)",
        }}
      >
        <Sparkles className="relative z-10 h-5 w-5 shrink-0" />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              animate={{ opacity: 1, width: "auto" }}
              className="relative z-10 truncate"
              exit={{ opacity: 0, width: 0 }}
              initial={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
            >
              Sign In
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      {/* User info */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2",
          isCollapsed && "justify-center px-2"
        )}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
            boxShadow: "0 0 15px oklch(0.65 0.25 290 / 25%)",
          }}
        >
          <User className="h-4 w-4 text-white" />
        </div>

        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              animate={{ opacity: 1, width: "auto" }}
              className="flex flex-col truncate"
              exit={{ opacity: 0, width: 0 }}
              initial={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
            >
              <span
                className="truncate font-heading font-medium text-sm"
                style={{ color: "oklch(0.95 0.02 280)" }}
              >
                {session.user.name || "User"}
              </span>
              <span
                className="truncate text-xs"
                style={{ color: "oklch(0.60 0.04 280)" }}
              >
                {session.user.email}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sign out button */}
      <button
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-heading font-medium text-sm transition-all duration-200",
          isCollapsed && "justify-center px-2"
        )}
        onClick={() => {
          authClient.signOut({
            fetchOptions: {
              onSuccess: () => router.push("/"),
            },
          });
        }}
        style={{
          color: "oklch(0.68 0.20 25)",
        }}
        type="button"
      >
        <LogOut className="relative z-10 h-5 w-5 shrink-0" />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              animate={{ opacity: 1, width: "auto" }}
              className="relative z-10 truncate"
              exit={{ opacity: 0, width: 0 }}
              initial={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
            >
              Sign Out
            </motion.span>
          )}
        </AnimatePresence>
        <span
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: "oklch(0.68 0.20 25 / 10%)" }}
        />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Collapse Toggle
// ─────────────────────────────────────────────────────────────
function SidebarCollapseToggle() {
  const { isCollapsed, setCollapsed } = useSidebar();

  return (
    <button
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="group relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
      onClick={() => setCollapsed(!isCollapsed)}
      style={{
        color: "oklch(0.65 0.04 280)",
      }}
      type="button"
    >
      {isCollapsed ? (
        <PanelLeft className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
      <span
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: "oklch(0.65 0.25 290 / 15%)" }}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Desktop Sidebar
// ─────────────────────────────────────────────────────────────
function DesktopSidebar({ className }: { className?: string }) {
  const { isCollapsed, collapsedWidth, expandedWidth } = useSidebar();

  return (
    <motion.aside
      animate={{ width: isCollapsed ? collapsedWidth : expandedWidth }}
      className={cn(
        "relative flex h-full shrink-0 flex-col overflow-hidden",
        className
      )}
      style={{
        background: "oklch(0.08 0.02 270 / 80%)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid oklch(0.65 0.25 290 / 15%)",
      }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header with logo */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center justify-between px-4",
          isCollapsed && "justify-center px-2"
        )}
        style={{
          borderBottom: "1px solid oklch(0.65 0.25 290 / 10%)",
        }}
      >
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              animate={{ opacity: 1 }}
              className="font-bold font-heading text-xl tracking-tight"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              transition={{ duration: 0.15 }}
            >
              yoda.fun
            </motion.div>
          )}
        </AnimatePresence>

        <SidebarCollapseToggle />
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {navItems.map((item) => (
          <SidebarNavItem key={item.to} {...item} isCollapsed={isCollapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div
        className="shrink-0 space-y-1 p-2"
        style={{
          borderTop: "1px solid oklch(0.65 0.25 290 / 10%)",
        }}
      >
        <SidebarUser isCollapsed={isCollapsed} />
      </div>

      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute top-1/3 -left-20 h-40 w-40 rounded-full blur-3xl"
        style={{
          background: "oklch(0.65 0.25 290 / 8%)",
        }}
      />
    </motion.aside>
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
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.to}
              {...item}
              isCollapsed={false}
              onClick={() => setOpen(false)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div
          className="shrink-0 space-y-1 p-3"
          style={{
            borderTop: "1px solid oklch(0.65 0.25 290 / 10%)",
          }}
        >
          <SidebarUser isCollapsed={false} />
        </div>
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
