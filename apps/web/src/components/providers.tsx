"use client";

import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { env } from "@/env";
import { useReferralAutoApply } from "@/hooks/use-referral-auto-apply";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { Web3Provider } from "./web3-provider";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const signIn = useMutation({
    mutationFn: () => authClient.signIn.anonymous(),
    onSuccess: async (data) => {
      const session = await authClient.getSession();
      console.log(data, session);
    },
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (!(signIn.isPending || isAuthenticating)) {
      setIsAuthenticating(true);
      signIn.mutate();
    }
  }, [signIn]);

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
          <AuthProvider>
            <ReferralAutoApply>{children}</ReferralAutoApply>
          </AuthProvider>
        </Web3Provider>
        <Toaster richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
