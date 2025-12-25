"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const SIDEBAR_COOKIE_NAME = "sidebar_collapsed";
const SIDEBAR_COLLAPSED_WIDTH = 64;
const SIDEBAR_EXPANDED_WIDTH = 256;
const MOBILE_BREAKPOINT = 1024; // lg breakpoint

interface SidebarContextValue {
  isOpen: boolean;
  isCollapsed: boolean;
  isMobile: boolean;
  collapsedWidth: number;
  expandedWidth: number;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const [isOpen, setOpen] = useState(false);
  const [isCollapsed, setCollapsedState] = useState(defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load collapsed state from cookie on mount
  useEffect(() => {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === SIDEBAR_COOKIE_NAME) {
        setCollapsedState(value === "true");
        break;
      }
    }
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setCollapsedState(collapsed);
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is experimental/async, document.cookie is appropriate here
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, []);

  const toggle = useCallback(() => {
    if (isMobile) {
      setOpen((prev) => !prev);
    } else {
      setCollapsed(!isCollapsed);
    }
  }, [isMobile, isCollapsed, setCollapsed]);

  const value = useMemo<SidebarContextValue>(
    () => ({
      isOpen,
      isCollapsed,
      isMobile,
      collapsedWidth: SIDEBAR_COLLAPSED_WIDTH,
      expandedWidth: SIDEBAR_EXPANDED_WIDTH,
      toggle,
      setOpen,
      setCollapsed,
    }),
    [isOpen, isCollapsed, isMobile, toggle, setCollapsed]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}
