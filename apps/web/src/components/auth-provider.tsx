"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: isLoadingSession } =
    authClient.useSession();
  const { mutate, isPending, isSuccess, isError } = useMutation({
    mutationFn: () => authClient.signIn.anonymous(),
  });

  useEffect(() => {
    if (!(isLoadingSession || session || isPending || isSuccess || isError)) {
      mutate();
    }
  }, [isLoadingSession, session, isPending, isSuccess, isError, mutate]);

  return <>{children}</>;
}
