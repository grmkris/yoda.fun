"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { env } from "@/env";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { Web3Provider } from "./web3-provider";

function AutoAnonymousAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    // Auto sign-in anonymously if no session exists
    if (!(isPending || session)) {
      authClient.signIn.anonymous();
    }
  }, [session, isPending]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        {env.NEXT_PUBLIC_ENV === "dev" && <ReactQueryDevtools />}
        <Web3Provider>
          <AutoAnonymousAuth>{children}</AutoAnonymousAuth>
        </Web3Provider>
        <Toaster richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
