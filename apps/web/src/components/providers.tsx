"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/utils/orpc";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { Web3Provider } from "./web3-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <QueryClientProvider client={queryClient}>
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
        <Web3Provider>{children}</Web3Provider>
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
