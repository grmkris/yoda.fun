import type { Signer } from "ethers";

/**
 * Interface for decryption operations.
 * The relayer SDK's FhevmInstance has a lower-level userDecrypt() method;
 * these convenience wrappers expect a higher-level adapter with typed methods.
 */
export interface DecryptInstance {
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
export function decryptBalance(
  instance: DecryptInstance,
  handle: bigint | string,
  contractAddress: string,
  signer: Signer
): Promise<bigint> {
  return instance.userDecrypt64(handle, contractAddress, signer);
}

/**
 * Decrypt an encrypted vote (ebool) using the user's signer.
 */
export function decryptVote(
  instance: DecryptInstance,
  handle: bigint | string,
  contractAddress: string,
  signer: Signer
): Promise<boolean> {
  return instance.userDecryptBool(handle, contractAddress, signer);
}
