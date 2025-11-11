"use client";

import { type ComponentProps, useState } from "react";
import { useAccount, useConnect, useConnectors, useDisconnect } from "wagmi";
import { Button } from "./ui/button";

const COPIED_TIMEOUT_MS = 2000;
const ADDRESS_PREFIX_LENGTH = 6;
const ADDRESS_SUFFIX_LENGTH = 4;

type PortoConnectButtonProps = {
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
};

export function PortoConnectButton({
  size = "sm",
  className,
}: PortoConnectButtonProps) {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_TIMEOUT_MS);
    }
  };

  const formatAddress = (addr: string) =>
    `${addr.slice(0, ADDRESS_PREFIX_LENGTH)}...${addr.slice(-ADDRESS_SUFFIX_LENGTH)}`;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={handleCopyAddress} size={size} variant="outline">
          {copied ? "Copied!" : formatAddress(address)}
        </Button>
        <Button onClick={() => disconnect()} size={size} variant="ghost">
          Disconnect
        </Button>
      </div>
    );
  }

  const portoConnector = connectors.find((c) => c.name === "Porto");

  if (!portoConnector) {
    return <div>No connector found</div>;
  }

  return (
    <Button
      className={className}
      disabled={isPending}
      onClick={() => connect({ connector: portoConnector })}
      size={size}
    >
      {isPending ? "Connecting..." : "⚡ Connect Wallet to Start"}
    </Button>
  );
}
