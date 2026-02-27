import type { Eip1193Provider } from "ethers";

export type { FhevmInstance } from "@zama-fhe/relayer-sdk/node";

declare const window: Record<string, unknown> | undefined;

interface CreateFhevmInstanceOptions {
  /** RPC URL (Node.js) or EIP-1193 provider (browser). Auto-detected if omitted. */
  network?: string | Eip1193Provider;
}

/**
 * Environment-aware FHEVM instance factory.
 * Uses @zama-fhe/relayer-sdk/node in Node.js, /web in browser.
 */
export async function createFhevmInstance(
  options?: CreateFhevmInstanceOptions
) {
  const isNode = typeof window === "undefined";

  const mod = isNode
    ? await import("@zama-fhe/relayer-sdk/node")
    : await import("@zama-fhe/relayer-sdk/web");

  let network = options?.network;

  if (!network) {
    if (isNode) {
      const apiKey = process.env.INFURA_API_KEY;
      if (!apiKey) {
        throw new Error(
          "createFhevmInstance: pass options.network or set INFURA_API_KEY"
        );
      }
      network = `https://sepolia.infura.io/v3/${apiKey}`;
    } else {
      // Browser: use injected wallet provider
      network = (window as unknown as { ethereum?: Eip1193Provider })?.ethereum;
      if (!network) {
        throw new Error("createFhevmInstance: no wallet provider found");
      }
    }
  }

  return mod.createInstance({
    ...mod.SepoliaConfig,
    network,
  });
}
