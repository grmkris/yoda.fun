declare module "@zama-fhe/relayer-sdk" {
  export class RelayerClient {
    init(): Promise<void>;
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
}
