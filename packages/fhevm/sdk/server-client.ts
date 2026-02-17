import {
  type Hex,
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
      metadataUri: string,
      votingEndsAt: bigint,
      resolutionDeadline: bigint
    ): Promise<{ marketId: bigint; txHash: `0x${string}` }> {
      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "createMarket",
        args: [title, metadataUri, votingEndsAt, resolutionDeadline],
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

    /// Submit KMS-verified decrypted totals (permissionless, verifies KMS proof on-chain)
    async submitVerifiedTotals(
      marketId: bigint,
      abiEncodedCleartexts: `0x${string}`,
      decryptionProof: `0x${string}`
    ): Promise<`0x${string}`> {
      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "submitVerifiedTotals",
        args: [marketId, abiEncodedCleartexts, decryptionProof],
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error(`submitVerifiedTotals reverted: ${hash}`);
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
        metadataUri,
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
        metadataUri,
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

    /// Read encrypted FHE handles for a market's YES/NO totals
    async getMarketHandles(
      marketId: bigint
    ): Promise<[Hex, Hex]> {
      const handles = await publicClient.readContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "getMarketHandles",
        args: [marketId],
      });
      return handles as [Hex, Hex];
    },

    /// Full resolve flow: resolve → decrypt via KMS → submit verified totals
    async resolveAndDecrypt(
      marketId: bigint,
      result: number,
      rpcUrl?: string
    ): Promise<{
      resolveTxHash: Hex;
      submitTotalsTxHash: Hex | null;
      decryptedYes: bigint | null;
      decryptedNo: bigint | null;
    }> {
      // 1. Resolve market on-chain
      const { request: resolveReq } = await publicClient.simulateContract({
        account,
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "resolveMarket",
        args: [marketId, result],
      });
      const resolveTxHash = await walletClient.writeContract(resolveReq);
      const resolveReceipt = await publicClient.waitForTransactionReceipt({
        hash: resolveTxHash,
      });
      if (resolveReceipt.status === "reverted") {
        throw new Error(`resolveMarket reverted: ${resolveTxHash}`);
      }

      // For INVALID result (3), skip decryption — users get refunds directly
      if (result === 3) {
        return {
          resolveTxHash,
          submitTotalsTxHash: null,
          decryptedYes: null,
          decryptedNo: null,
        };
      }

      // 2. Read encrypted handles
      const handles = await publicClient.readContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "getMarketHandles",
        args: [marketId],
      }) as [Hex, Hex];

      // 3. KMS-verified decryption via Relayer SDK
      const { createFhevmInstance } = await import("./client");
      const network = rpcUrl ?? config.rpcUrl;
      const instance = await createFhevmInstance({ network });
      const results = await instance.publicDecrypt(handles);

      const values = Object.values(results.clearValues);
      const decryptedYes = BigInt(values[0] ?? 0);
      const decryptedNo = BigInt(values[1] ?? 0);

      // 4. Submit verified totals on-chain
      const { request: submitReq } = await publicClient.simulateContract({
        account,
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "submitVerifiedTotals",
        args: [
          marketId,
          results.abiEncodedClearValues,
          results.decryptionProof,
        ],
      });
      const submitTotalsTxHash = await walletClient.writeContract(submitReq);
      const submitReceipt = await publicClient.waitForTransactionReceipt({
        hash: submitTotalsTxHash,
      });
      if (submitReceipt.status === "reverted") {
        throw new Error(
          `submitVerifiedTotals reverted: ${submitTotalsTxHash}`
        );
      }

      return {
        resolveTxHash,
        submitTotalsTxHash,
        decryptedYes,
        decryptedNo,
      };
    },

    /// Get the admin signer address
    getAddress: () => account.address,

    /// Get contract addresses
    getContracts: () => contracts,
  };
}

export type FhevmClient = ReturnType<typeof createFhevmClient>;
