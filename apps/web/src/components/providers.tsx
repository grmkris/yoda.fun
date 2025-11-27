"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { env } from "@/env";
import { PostHogProvider } from "@/providers/posthog-provider";
import { queryClient } from "@/utils/orpc";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { Web3Provider } from "./web3-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          {env.NEXT_PUBLIC_ENV === "dev" && <ReactQueryDevtools />}
          <Web3Provider>{children}</Web3Provider>
          <Toaster richColors />
        </ThemeProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
}
