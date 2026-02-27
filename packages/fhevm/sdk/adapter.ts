import { BrowserProvider, JsonRpcSigner } from "ethers";
import type { WalletClient } from "viem";

/**
 * Bridges a viem/wagmi WalletClient to an ethers JsonRpcSigner.
 * Required because @zama-fhe/relayer-sdk only accepts ethers signers.
 */
export function walletClientToSigner(
  walletClient: WalletClient
): JsonRpcSigner {
  const { account, chain, transport } = walletClient;

  if (!(account && chain)) {
    throw new Error("WalletClient must have account and chain");
  }

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  const provider = new BrowserProvider(transport, network);
  return new JsonRpcSigner(provider, account.address);
}
