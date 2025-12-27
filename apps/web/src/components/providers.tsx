"use client";

import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { env } from "@/env";
import { useReferralAutoApply } from "@/hooks/use-referral-auto-apply";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";
import { useSession } from "./session-provider";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { Web3Provider } from "./web3-provider";

function AutoAnonymousAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const signIn = useMutation({
    mutationFn: () => authClient.signIn.anonymous(),
  });

  useEffect(() => {
    if (!(isPending || session || signIn.isPending)) {
      signIn.mutate();
    }
  }, [isPending, session, signIn.isPending]);

  return <>{children}</>;
}

function ReferralAutoApply({ children }: { children: React.ReactNode }) {
  useReferralAutoApply();
  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        forcedTheme="dark"
      >
        {env.NEXT_PUBLIC_ENV === "dev" && <ReactQueryDevtools />}
        <Web3Provider>
          <AutoAnonymousAuth>
            <ReferralAutoApply>{children}</ReferralAutoApply>
          </AutoAnonymousAuth>
        </Web3Provider>
        <Toaster richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
