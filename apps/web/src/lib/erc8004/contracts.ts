import { keccak256, toHex } from "viem";

// Base Sepolia contract addresses
export const ERC8004_CONTRACTS = {
  chainId: 84_532,
  identityRegistry: "0x8004AA63c570c570eBF15376c0dB199918BFe9Fb" as const,
  reputationRegistry: "0x8004bd8daB57f14Ed299135749a5CB5c42d341BF" as const,
} as const;

// Feedback tags for categorization
export const FEEDBACK_TAGS = {
  RESOLUTION: keccak256(toHex("resolution")),
  QUALITY: keccak256(toHex("quality")),
} as const;

// Minimal ABI for giveFeedback function
export const REPUTATION_REGISTRY_ABI = [
  {
    type: "function",
    name: "giveFeedback",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "score", type: "uint8" },
      { name: "tag1", type: "bytes32" },
      { name: "tag2", type: "bytes32" },
      { name: "feedbackUri", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
      { name: "feedbackAuth", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// Zero bytes32 for unused fields
export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
