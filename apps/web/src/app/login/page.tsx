"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PortoConnectButton } from "@/components/porto-connect-button";
import { useSession } from "@/components/session-provider";

export default function LoginPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (session?.user) {
      router.push("/dashboard");
    }
  }, [session, router]);

  return (
    <div className="container mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
      <div className="w-full space-y-6 rounded-lg border p-8">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in with your Ethereum wallet to continue
          </p>
        </div>

        <div className="flex justify-center">
          <PortoConnectButton />
        </div>
      </div>
    </div>
  );
}
