export const FHEVM_CONFIG = {
  sepolia: {
    chainId: 11_155_111,
    rpcUrl: "https://sepolia.infura.io/v3/",
    contracts: {
      mishaToken: "0xd6685Dd84DF3Cd344A41bAb2804892E7120f0413",
      confidentialMisha: "0xDeb73caC5494D5F835A751FB6341C992492696b7",
      mishaMarket: "0x39eF3A24f89a52220BaaFa3911599DbB7f712247",
    },
  },
} as const;

export type FhevmNetwork = keyof typeof FHEVM_CONFIG;
