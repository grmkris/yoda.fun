// biome-ignore lint/performance/noBarrelFile: package entry point
export { IDENTITY_REGISTRY_ABI } from "./abis/identity-registry";
export { REPUTATION_REGISTRY_ABI } from "./abis/reputation-registry";
export {
  createERC8004Client,
  type ERC8004Client,
  type ERC8004ClientConfig,
} from "./client";
export {
  ERC8004_CONTRACTS,
  FEEDBACK_TAGS,
  type FeedbackTagType,
} from "./constants";
export type {
  AgentProfile,
  FeedbackAuth,
  FeedbackAuthParams,
  FeedbackEntry,
  GenerateFeedbackAuthResult,
  ReputationSummary,
} from "./types";
