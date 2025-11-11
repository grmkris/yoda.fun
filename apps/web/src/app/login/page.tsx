"use client";
import { useRouter } from "next/navigation";
import { Hooks } from "porto/wagmi";
import { useEffect } from "react";
import { useAccount, useConnectors } from "wagmi";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [connector] = useConnectors();
  const { mutate: connect, isPending } = Hooks.useConnect();
  const { isConnected } = useAccount();
  const { data: session } = authClient.useSession();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (session?.user) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleConnect = () => {
    if (!connector) {
      return;
    }
    connect(
      {
        connector,
        signInWithEthereum: {
          authUrl: {
            nonce: "/api/auth/siwe/nonce",
            verify: "/api/auth/siwe/verify",
            logout: "/api/auth/siwe/logout",
          },
        },
      },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
      }
    );
  };

  return (
    <div className="container mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
      <div className="w-full space-y-6 rounded-lg border p-8">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in with your Ethereum wallet to continue
          </p>
        </div>

        <div className="space-y-4">
          {isConnected ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-4">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground text-sm">
                Wallet Connected
              </span>
            </div>
          ) : (
            <Button
              className="w-full"
              disabled={!connector || isPending}
              onClick={handleConnect}
              size="lg"
            >
              {isPending ? "Connecting..." : "Sign in with Ethereum"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
