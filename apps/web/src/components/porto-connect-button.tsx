"use client";

import type { ComponentProps } from "react";
import { useConnect, useConnection, useDisconnect } from "wagmi";
import { useSession } from "@/components/session-provider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

interface PortoConnectButtonProps {
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
}

export function PortoConnectButton({
  size = "default",
  className,
}: PortoConnectButtonProps) {
  const { isConnected, isConnecting, address } = useConnection();
  const { mutate: disconnect } = useDisconnect();
  const { connectors, connect, isPending } = useConnect();
  const { session, isPending: isSessionPending } = useSession();

  const porto = connectors?.find((c) => c.id === "xyz.ithaca.porto");

  const handleConnect = () => {
    if (!porto) {
      return;
    }
    connect({ connector: porto });
  };

  const handleDisconnect = async () => {
    await authClient.signOut();
    disconnect();
  };

  // Loading state
  if (isSessionPending) {
    return <Skeleton className={cn("h-9 w-32", className)} />;
  }

  // Porto not available
  if (!porto) {
    return (
      <Button className={className} disabled size={size}>
        Porto not available
      </Button>
    );
  }

  // Connected + authenticated
  if (isConnected && session?.user) {
    return (
      <Button
        className={className}
        onClick={handleDisconnect}
        size={size}
        variant="outline"
      >
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </Button>
    );
  }

  // Connected but no session (edge case - re-trigger SIWE)
  if (isConnected && !session?.user) {
    return (
      <Button
        className={className}
        disabled={isPending}
        onClick={handleConnect}
        size={size}
        variant="outline"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    );
  }

  // Not connected
  return (
    <Button
      className={className}
      disabled={isPending || isConnecting}
      onClick={handleConnect}
      size={size}
    >
      {isPending || isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
