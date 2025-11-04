"use client";
import { useQuery } from "@tanstack/react-query";
import { Hooks } from "porto/wagmi";
import { useAccount, useConnectors, useDisconnect } from "wagmi";
import { orpc } from "@/utils/orpc";

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

export default function Home() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const [connector] = useConnectors();
  const { connect } = Hooks.useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    if (!connector) return;
    connect({
      connector,
      signInWithEthereum: {
        authUrl: {
          nonce: "/api/auth/siwe/nonce",
          verify: "/api/auth/siwe/verify",
          logout: "/api/auth/siwe/logout",
        },
      },
    });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-muted-foreground text-sm">
              {(() => {
                if (healthCheck.isLoading) {
                  return "Checking...";
                }
                if (healthCheck.data) {
                  return "Connected";
                }
                return "Disconnected";
              })()}
            </span>
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="mb-4 font-medium">Wallet Connection (SIWE)</h2>
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground text-sm">Connected</span>
              </div>
              <div className="rounded bg-muted p-3">
                <p className="text-muted-foreground text-xs mb-1">Address</p>
                <p className="font-mono text-sm break-all">{address}</p>
              </div>
              <button
                type="button"
                onClick={() => disconnect()}
                className="rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!connector}
              className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Sign in with Ethereum
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
