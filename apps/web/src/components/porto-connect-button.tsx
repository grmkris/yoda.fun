"use client";

import type { ComponentProps } from "react";
import { useConnect, useConnection, useConnectors, useDisconnect } from "wagmi";
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
  const { mutate: connect, isPending } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const connectors = useConnectors();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const porto = connectors?.find((c) => c.name === "Porto");

  // Loading state
  if (isSessionPending) {
    return <Skeleton className={cn("h-9 w-32", className)} />;
  }

  // Connected + authenticated: show user name
  if (isConnected) {
    return (
      <Button
        className={className}
        onClick={() => disconnect()}
        size={size}
        variant="outline"
      >
        Connected {address?.slice(0, 6)}...{address?.slice(-4)}
      </Button>
    );
  }

  if (isConnected && !session?.user) {
    return (
      <Button
        className={className}
        // TODO add siwe
        size={size}
        variant="outline"
      >
        Sign in
      </Button>
    );
  }

  // Not connected: show connect button
  if (!porto) {
    return (
      <Button className={className} disabled size={size}>
        Porto not available
      </Button>
    );
  }

  return (
    <Button
      className={className}
      disabled={isPending || isConnecting}
      onClick={() => connect({ connector: porto })}
      size={size}
    >
      {isPending || isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
