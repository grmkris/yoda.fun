import type { Signer } from "ethers";

interface RelayerInstance {
  userDecrypt64(
    handle: bigint | string,
    contractAddress: string,
    signer: Signer
  ): Promise<bigint>;
  userDecryptBool(
    handle: bigint | string,
    contractAddress: string,
    signer: Signer
  ): Promise<boolean>;
}

/**
 * Decrypt an encrypted balance (euint64) using the user's signer.
 * Only works if the user has ACL permission on the handle.
 */
export async function decryptBalance(
  instance: RelayerInstance,
  handle: bigint | string,
  contractAddress: string,
  signer: Signer
): Promise<bigint> {
  return instance.userDecrypt64(handle, contractAddress, signer);
}

/**
 * Decrypt an encrypted vote (ebool) using the user's signer.
 */
export async function decryptVote(
  instance: RelayerInstance,
  handle: bigint | string,
  contractAddress: string,
  signer: Signer
): Promise<boolean> {
  return instance.userDecryptBool(handle, contractAddress, signer);
}
