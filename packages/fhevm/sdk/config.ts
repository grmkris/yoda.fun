export const FHEVM_CONFIG = {
  sepolia: {
    chainId: 11155111,
    rpcUrl: "https://sepolia.infura.io/v3/",
    contracts: {
      mishaToken: "0xCeF431F34BC12Ea10935E64Ad19F19a7bA3677E4",
      confidentialMisha: "0x8327CE076DE89A8140cfEa67A939f43F7225638B",
      mishaMarket: "0xD666442d7FD30E4A2F2bF3E7B3d990AFc47297C6",
    },
  },
} as const;

export type FhevmNetwork = keyof typeof FHEVM_CONFIG;
