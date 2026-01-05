import type { Logger } from "@yoda.fun/logger";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  http,
  keccak256,
  parseAbiParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { IDENTITY_REGISTRY_ABI } from "./abis/identity-registry";
import { REPUTATION_REGISTRY_ABI } from "./abis/reputation-registry";
import { ERC8004_CONTRACTS, FEEDBACK_TAGS } from "./constants";
import type {
  FeedbackAuthParams,
  FeedbackEntry,
  GenerateFeedbackAuthResult,
  ReputationSummary,
} from "./types";

export interface ERC8004ClientConfig {
  privateKey: `0x${string}`;
  logger: Logger;
}

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export function createERC8004Client(config: ERC8004ClientConfig) {
  const { privateKey, logger } = config;
  const account = privateKeyToAccount(privateKey);
  const chain = baseSepolia;
  const contracts = ERC8004_CONTRACTS.baseSepolia;

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  return {
    /**
     * Register a new agent identity (one-time operation)
     */
    async registerAgent(tokenUri: string): Promise<bigint> {
      logger.info({ tokenUri }, "Registering agent identity");

      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.identityRegistry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "register",
        args: [tokenUri],
      });

      const hash = await walletClient.writeContract(request);
      logger.info({ hash }, "Agent registration tx submitted");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error(`Agent registration reverted: ${hash}`);
      }

      // Extract agentId from Registered event
      const registeredEvent = receipt.logs.find((log) => {
        try {
          return (
            log.topics[0] ===
            keccak256(
              new TextEncoder().encode("Registered(uint256,string,address)")
            )
          );
        } catch {
          return false;
        }
      });

      if (!registeredEvent?.topics[1]) {
        throw new Error("Could not find Registered event in receipt");
      }

      const agentId = BigInt(registeredEvent.topics[1]);
      logger.info(
        { hash, agentId: agentId.toString(), blockNumber: receipt.blockNumber },
        "Agent registration confirmed"
      );

      return agentId;
    },

    /**
     * Generate feedbackAuth signature for a client to submit feedback
     */
    async generateFeedbackAuth(
      params: FeedbackAuthParams
    ): Promise<GenerateFeedbackAuthResult> {
      const { agentId, clientAddress, indexLimit, expiry } = params;
      const chainId = BigInt(chain.id);

      // Encode the FeedbackAuth struct
      const encodedAuth = encodeAbiParameters(
        parseAbiParameters(
          "uint256, address, uint64, uint256, uint256, address, address"
        ),
        [
          agentId,
          clientAddress,
          indexLimit,
          expiry,
          chainId,
          contracts.identityRegistry,
          account.address,
        ]
      );

      // Create message hash for signing
      const messageHash = keccak256(encodedAuth);

      // Sign with EIP-191 personal sign
      const signature = await walletClient.signMessage({
        account,
        message: { raw: messageHash },
      });

      // Combine encoded auth + signature (224 bytes auth + 65 bytes sig)
      const fullAuth = (encodedAuth + signature.slice(2)) as `0x${string}`;

      logger.debug(
        {
          agentId: agentId.toString(),
          clientAddress,
          indexLimit: indexLimit.toString(),
          expiry: expiry.toString(),
        },
        "Generated feedbackAuth"
      );

      return {
        auth: fullAuth,
        agentId,
        expiry,
        indexLimit,
      };
    },

    /**
     * Get the last feedback index for a client-agent pair
     */
    async getLastIndex(
      agentId: bigint,
      clientAddress: `0x${string}`
    ): Promise<bigint> {
      const result = await publicClient.readContract({
        address: contracts.reputationRegistry,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "getLastIndex",
        args: [agentId, clientAddress],
      });
      return result;
    },

    /**
     * Get reputation summary for an agent, optionally filtered by tag
     */
    async getSummary(
      agentId: bigint,
      tag?: `0x${string}`
    ): Promise<ReputationSummary> {
      const [count, averageScore] = await publicClient.readContract({
        address: contracts.reputationRegistry,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "getSummary",
        args: [agentId, [], tag ?? ZERO_BYTES32, ZERO_BYTES32],
      });
      return { count, averageScore };
    },

    /**
     * Get reputation summaries for both resolution and quality tags
     */
    async getFullSummary(agentId: bigint): Promise<{
      resolution: ReputationSummary;
      quality: ReputationSummary;
      total: ReputationSummary;
    }> {
      const [resolution, quality, total] = await Promise.all([
        this.getSummary(agentId, FEEDBACK_TAGS.RESOLUTION),
        this.getSummary(agentId, FEEDBACK_TAGS.QUALITY),
        this.getSummary(agentId),
      ]);
      return { resolution, quality, total };
    },

    /**
     * Read a specific feedback entry
     */
    async readFeedback(
      agentId: bigint,
      clientAddress: `0x${string}`,
      index: bigint
    ): Promise<FeedbackEntry> {
      const [score, tag1, tag2, isRevoked] = await publicClient.readContract({
        address: contracts.reputationRegistry,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "readFeedback",
        args: [agentId, clientAddress, index],
      });
      return { score, tag1, tag2, isRevoked };
    },

    /**
     * Get all clients who have given feedback to an agent
     */
    async getClients(agentId: bigint): Promise<`0x${string}`[]> {
      const clients = await publicClient.readContract({
        address: contracts.reputationRegistry,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "getClients",
        args: [agentId],
      });
      return clients as `0x${string}`[];
    },

    /**
     * Get agent owner address
     */
    async getAgentOwner(agentId: bigint): Promise<`0x${string}`> {
      const owner = await publicClient.readContract({
        address: contracts.identityRegistry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "ownerOf",
        args: [agentId],
      });
      return owner as `0x${string}`;
    },

    /**
     * Get agent token URI
     */
    async getAgentTokenUri(agentId: bigint): Promise<string> {
      const uri = await publicClient.readContract({
        address: contracts.identityRegistry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "tokenURI",
        args: [agentId],
      });
      return uri;
    },

    /**
     * Get the signer address (agent owner wallet)
     */
    getAddress: () => account.address,

    /**
     * Get contract addresses
     */
    getContracts: () => contracts,

    /**
     * Get chain info
     */
    getChain: () => chain,
  };
}

export type ERC8004Client = ReturnType<typeof createERC8004Client>;
