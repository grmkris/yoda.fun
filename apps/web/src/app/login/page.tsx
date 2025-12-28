"use client";

import { PortoConnectButton } from "@/components/porto-connect-button";

export default function LoginPage() {
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
