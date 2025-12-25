"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  LayoutDashboard,
  Ticket,
  Wallet,
  Trophy,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  User,
  Sparkles,
} from "lucide-react";
import { useTheme } from "next-themes";

import { useSidebar, SidebarProvider } from "./sidebar-context";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  icon: React.ComponentType<{ className?: string }>;
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
      href={to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-heading text-sm font-medium transition-all duration-200",
        isCollapsed && "justify-center px-2"
      )}
      style={{
        color: isActive ? "oklch(0.95 0.02 280)" : "oklch(0.65 0.04 280)",
        background: isActive ? "oklch(0.65 0.25 290 / 15%)" : "transparent",
      }}
    >
      {/* Active indicator glow */}
      {isActive && (
        <motion.span
          layoutId="sidebar-active-indicator"
          className="absolute inset-0 rounded-xl"
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
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 truncate"
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
// Theme Toggle
// ─────────────────────────────────────────────────────────────
function SidebarThemeToggle({ isCollapsed }: { isCollapsed: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      type="button"
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-heading text-sm font-medium transition-all duration-200",
        isCollapsed && "justify-center px-2"
      )}
      style={{
        color: "oklch(0.65 0.04 280)",
      }}
    >
      <div className="relative z-10 h-5 w-5 shrink-0">
        <Sun className="absolute h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </div>

      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 truncate"
          >
            Theme
          </motion.span>
        )}
      </AnimatePresence>

      <span
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: "oklch(0.65 0.25 290 / 8%)" }}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// User Section
// ─────────────────────────────────────────────────────────────
function SidebarUser({ isCollapsed }: { isCollapsed: boolean }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className={cn("flex items-center gap-3 px-3", isCollapsed && "px-2")}>
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        {!isCollapsed && <Skeleton className="h-4 w-20" />}
      </div>
    );
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-heading text-sm font-medium transition-all duration-200",
          isCollapsed && "justify-center px-2"
        )}
        style={{
          color: "oklch(0.72 0.18 175)",
          background: "oklch(0.72 0.18 175 / 10%)",
        }}
      >
        <Sparkles className="relative z-10 h-5 w-5 shrink-0" />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="relative z-10 truncate"
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
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col truncate"
            >
              <span
                className="truncate font-heading text-sm font-medium"
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
        onClick={() => {
          authClient.signOut({
            fetchOptions: {
              onSuccess: () => router.push("/"),
            },
          });
        }}
        type="button"
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-heading text-sm font-medium transition-all duration-200",
          isCollapsed && "justify-center px-2"
        )}
        style={{
          color: "oklch(0.68 0.20 25)",
        }}
      >
        <LogOut className="relative z-10 h-5 w-5 shrink-0" />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="relative z-10 truncate"
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
      onClick={() => setCollapsed(!isCollapsed)}
      type="button"
      className="group relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200"
      style={{
        color: "oklch(0.65 0.04 280)",
      }}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
      className={cn(
        "relative flex h-full shrink-0 flex-col overflow-hidden",
        className
      )}
      animate={{ width: isCollapsed ? collapsedWidth : expandedWidth }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background: "oklch(0.08 0.02 270 / 80%)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid oklch(0.65 0.25 290 / 15%)",
      }}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="font-heading font-bold text-xl tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
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
          <SidebarNavItem
            key={item.to}
            {...item}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div
        className="shrink-0 space-y-1 p-2"
        style={{
          borderTop: "1px solid oklch(0.65 0.25 290 / 10%)",
        }}
      >
        <SidebarThemeToggle isCollapsed={isCollapsed} />
        <SidebarUser isCollapsed={isCollapsed} />
      </div>

      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute -left-20 top-1/3 h-40 w-40 rounded-full blur-3xl"
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
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="left" className="p-0">
        {/* Header with logo */}
        <div
          className="flex h-14 shrink-0 items-center px-4"
          style={{
            borderBottom: "1px solid oklch(0.65 0.25 290 / 10%)",
          }}
        >
          <div
            className="font-heading font-bold text-xl tracking-tight"
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
          <SidebarThemeToggle isCollapsed={false} />
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

export {
  SidebarProvider,
  useSidebar,
  AppSidebar,
  DesktopSidebar,
  MobileSidebar,
};
