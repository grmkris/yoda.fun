export interface FeedbackAuth {
  agentId: bigint;
  clientAddress: `0x${string}`;
  indexLimit: bigint;
  expiry: bigint;
  chainId: bigint;
  identityRegistry: `0x${string}`;
  signerAddress: `0x${string}`;
}

export interface FeedbackAuthParams {
  agentId: bigint;
  clientAddress: `0x${string}`;
  indexLimit: bigint;
  expiry: bigint;
}

export interface ReputationSummary {
  count: bigint;
  averageScore: number;
}

export interface FeedbackEntry {
  score: number;
  tag1: `0x${string}`;
  tag2: `0x${string}`;
  isRevoked: boolean;
}

export interface AgentProfile {
  agentId: bigint;
  ownerAddress: `0x${string}`;
  tokenUri: string;
}

export interface GenerateFeedbackAuthResult {
  auth: `0x${string}`;
  agentId: bigint;
  expiry: bigint;
  indexLimit: bigint;
}
