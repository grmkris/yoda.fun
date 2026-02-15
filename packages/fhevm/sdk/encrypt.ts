interface RelayerInstance {
  createEncryptedInput(
    contractAddress: string,
    userAddress: string
  ): {
    addBool(value: boolean): unknown;
    add64(value: number | bigint): unknown;
    encrypt(): Promise<{
      handles: Uint8Array[];
      inputProof: Uint8Array;
    }>;
  };
}

/**
 * Encrypt a bet (vote + amount) for the MishaMarket contract.
 * Returns handles and proof ready to pass to placeBet().
 */
export async function encryptBet(
  instance: RelayerInstance,
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
 */
export async function encryptAmount(
  instance: RelayerInstance,
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
