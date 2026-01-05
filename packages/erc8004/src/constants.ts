import { keccak256, toHex } from "viem";

export const ERC8004_CONTRACTS = {
  baseSepolia: {
    chainId: 84_532,
    identityRegistry:
      "0x8004AA63c570c570eBF15376c0dB199918BFe9Fb" as `0x${string}`,
    reputationRegistry:
      "0x8004bd8daB57f14Ed299135749a5CB5c42d341BF" as `0x${string}`,
  },
} as const;

export const FEEDBACK_TAGS = {
  RESOLUTION: keccak256(toHex("resolution")),
  QUALITY: keccak256(toHex("quality")),
} as const;

export type FeedbackTagType = keyof typeof FEEDBACK_TAGS;
