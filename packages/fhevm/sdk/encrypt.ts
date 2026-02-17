import type { FhevmInstance } from "./client";

/**
 * Encrypt a bet (vote + amount) for the MishaMarket contract.
 * Returns handles and proof ready to pass to placeBet().
 *
 * @param amount — Amount in cMISHA 6-decimal units (e.g. 100_000000 for 100 cMISHA).
 */
export async function encryptBet(
  instance: FhevmInstance,
  contractAddress: string,
  userAddress: string,
  vote: boolean,
  amount: number
) {
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.addBool(vote);
  input.add64(amount);
  const encrypted = await input.encrypt();

  return {
    encryptedVote: encrypted.handles[0],
    encryptedAmount: encrypted.handles[1],
    inputProof: encrypted.inputProof,
  };
}

/**
 * Encrypt a token amount for transfer/approve operations.
 *
 * @param amount — Amount in cMISHA 6-decimal units (e.g. 100_000000 for 100 cMISHA).
 */
export async function encryptAmount(
  instance: FhevmInstance,
  contractAddress: string,
  userAddress: string,
  amount: number
) {
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add64(amount);
  const encrypted = await input.encrypt();

  return {
    encryptedAmount: encrypted.handles[0],
    inputProof: encrypted.inputProof,
  };
}
