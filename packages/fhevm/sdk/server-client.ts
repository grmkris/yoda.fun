import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { mishaTokenAbi, mishaMarketAbi } from "./abis";
import { FHEVM_CONFIG } from "./config";

export interface FhevmClientConfig {
  privateKey: `0x${string}`;
  rpcUrl?: string;
}

export function createFhevmClient(config: FhevmClientConfig) {
  const { privateKey, rpcUrl } = config;
  const account = privateKeyToAccount(privateKey);
  const contracts = FHEVM_CONFIG.sepolia.contracts;

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  return {
    /// Create a prediction market on-chain
    async createMarket(
      title: string,
      votingEndsAt: bigint,
      resolutionDeadline: bigint
    ): Promise<{ marketId: bigint; txHash: `0x${string}` }> {
      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "createMarket",
        args: [title, votingEndsAt, resolutionDeadline],
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error(`createMarket reverted: ${hash}`);
      }

      // Parse MarketCreated event for marketId
      const marketCreatedLog = receipt.logs.find(
        (log: { address: string; topics: string[] }) => log.address.toLowerCase() === contracts.mishaMarket.toLowerCase()
      );

      if (!marketCreatedLog?.topics[1]) {
        throw new Error("MarketCreated event not found in receipt");
      }

      const marketId = BigInt(marketCreatedLog.topics[1]);
      return { marketId, txHash: hash };
    },

    /// Resolve a market with YES/NO/Invalid result
    async resolveMarket(
      marketId: bigint,
      result: number
    ): Promise<`0x${string}`> {
      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "resolveMarket",
        args: [marketId, result],
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error(`resolveMarket reverted: ${hash}`);
      }

      return hash;
    },

    /// Submit decrypted pool totals after Zama coprocessor decryption
    async setDecryptedTotals(
      marketId: bigint,
      yesTotal: bigint,
      noTotal: bigint
    ): Promise<`0x${string}`> {
      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "setDecryptedTotals",
        args: [marketId, yesTotal, noTotal],
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error(`setDecryptedTotals reverted: ${hash}`);
      }

      return hash;
    },

    /// Mint standard MISHA tokens to an address (faucet)
    async mintTokens(
      to: `0x${string}`,
      amount: bigint
    ): Promise<`0x${string}`> {
      const weiAmount = parseEther(amount.toString());

      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.mishaToken,
        abi: mishaTokenAbi,
        functionName: "mint",
        args: [to, weiAmount],
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error(`mint reverted: ${hash}`);
      }

      return hash;
    },

    /// Read on-chain market state
    async getMarket(marketId: bigint) {
      const result = await publicClient.readContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "getMarket",
        args: [marketId],
      });

      const [
        title,
        votingEndsAt,
        resolutionDeadline,
        status,
        marketResult,
        betCount,
        decryptedYesTotal,
        decryptedNoTotal,
        totalsDecrypted,
      ] = result;

      return {
        title,
        votingEndsAt,
        resolutionDeadline,
        status,
        result: marketResult,
        betCount,
        decryptedYesTotal,
        decryptedNoTotal,
        totalsDecrypted,
      };
    },

    /// Get total market count
    async getMarketCount(): Promise<bigint> {
      return publicClient.readContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "marketCount",
      });
    },

    /// Get user's bet info for a market
    async getUserBet(marketId: bigint, user: `0x${string}`) {
      const [vote, amount, exists, claimed] = await publicClient.readContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "getUserBet",
        args: [marketId, user],
      });

      return { vote, amount, exists, claimed };
    },

    /// Get the admin signer address
    getAddress: () => account.address,

    /// Get contract addresses
    getContracts: () => contracts,
  };
}

export type FhevmClient = ReturnType<typeof createFhevmClient>;
