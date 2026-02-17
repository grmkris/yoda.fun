import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { eq } from "@yoda.fun/db/drizzle";
import { mishaMarketAbi, FHEVM_CONFIG } from "@yoda.fun/fhevm/sdk";
import type { Logger } from "@yoda.fun/logger";
import { typeIdGenerator } from "@yoda.fun/shared/typeid";
import {
  createPublicClient,
  http,
  keccak256,
  type Log,
  toHex,
} from "viem";
import { sepolia } from "viem/chains";
import { fetchMarketMetadata } from "./metadata-fetcher";

const INDEXER_STATE_KEY = "lastIndexedBlock";
const POLL_INTERVAL_MS = 12_000; // ~1 Sepolia block

export interface MarketIndexerConfig {
  db: Database;
  logger: Logger;
  rpcUrl?: string;
}

export function createMarketIndexer(config: MarketIndexerConfig) {
  const { db, logger, rpcUrl } = config;
  const contracts = FHEVM_CONFIG.sepolia.contracts;

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  let running = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  async function getLastIndexedBlock(): Promise<bigint> {
    const result = await db
      .select()
      .from(DB_SCHEMA.indexerState)
      .where(eq(DB_SCHEMA.indexerState.key, INDEXER_STATE_KEY))
      .limit(1);

    if (result[0]) {
      return BigInt(result[0].value);
    }

    // Default: start from a recent block (contract deployment)
    return 0n;
  }

  async function setLastIndexedBlock(blockNumber: bigint): Promise<void> {
    await db
      .insert(DB_SCHEMA.indexerState)
      .values({
        key: INDEXER_STATE_KEY,
        value: blockNumber.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: DB_SCHEMA.indexerState.key,
        set: {
          value: blockNumber.toString(),
          updatedAt: new Date(),
        },
      });
  }

  async function handleMarketCreated(log: Log): Promise<void> {
    const marketId = log.topics[1]
      ? BigInt(log.topics[1])
      : null;

    if (marketId === null) {
      return;
    }

    // Read market data from chain
    const onChainMarket = await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "getMarket",
      args: [marketId],
    });

    const [title, metadataUri, votingEndsAt, resolutionDeadline] = onChainMarket;

    // Fetch metadata from URI
    const metadata = metadataUri
      ? await fetchMarketMetadata(metadataUri, logger)
      : null;

    // Check if market already exists
    const existing = await db
      .select()
      .from(DB_SCHEMA.market)
      .where(eq(DB_SCHEMA.market.onChainMarketId, Number(marketId)))
      .limit(1);

    if (existing[0]) {
      return;
    }

    await db.insert(DB_SCHEMA.market).values({
      id: typeIdGenerator("market"),
      title: metadata?.title ?? title,
      description: metadata?.description ?? null,
      category: metadata?.category ?? null,
      imageUrl: metadata?.image ?? null,
      thumbnailUrl: metadata?.thumbnail ?? null,
      tags: metadata?.tags ?? null,
      resolutionCriteria: metadata?.resolutionCriteria ?? null,
      metadataUri: metadataUri || null,
      onChainMarketId: Number(marketId),
      onChainTxHash: log.transactionHash ?? "",
      votingEndsAt: new Date(Number(votingEndsAt) * 1000),
      resolutionDeadline: new Date(Number(resolutionDeadline) * 1000),
      status: "LIVE",
    });

    logger.info(
      { onChainMarketId: Number(marketId), title },
      "Indexed MarketCreated"
    );
  }

  async function handleBetPlaced(log: Log): Promise<void> {
    const marketIdTopic = log.topics[1];
    const userTopic = log.topics[2];

    if (!marketIdTopic || !userTopic) {
      return;
    }

    const onChainMarketId = Number(BigInt(marketIdTopic));
    const userAddress = `0x${userTopic.slice(26)}`.toLowerCase();

    // Find market in DB
    const markets = await db
      .select()
      .from(DB_SCHEMA.market)
      .where(eq(DB_SCHEMA.market.onChainMarketId, onChainMarketId))
      .limit(1);

    const market = markets[0];
    if (!market) {
      logger.warn(
        { onChainMarketId },
        "BetPlaced for unknown market"
      );
      return;
    }

    // Try to resolve userAddress to a userId
    const wallets = await db
      .select()
      .from(DB_SCHEMA.walletAddress)
      .where(eq(DB_SCHEMA.walletAddress.address, userAddress))
      .limit(1);

    const userId = wallets[0]?.userId ?? null;

    // Insert bet (idempotent via unique constraint)
    try {
      await db.insert(DB_SCHEMA.bet).values({
        id: typeIdGenerator("bet"),
        userAddress,
        userId,
        marketId: market.id,
        onChainTxHash: log.transactionHash ?? "",
        status: "ACTIVE",
      });

      logger.info(
        { onChainMarketId, userAddress },
        "Indexed BetPlaced"
      );
    } catch {
      // Duplicate — already indexed
    }
  }

  async function handleMarketResolved(log: Log): Promise<void> {
    const marketIdTopic = log.topics[1];
    if (!marketIdTopic) {
      return;
    }

    const onChainMarketId = Number(BigInt(marketIdTopic));

    // Read updated market from chain to get result
    const onChainMarket = await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "getMarket",
      args: [BigInt(onChainMarketId)],
    });

    // result is at index 5 (after title, metadataUri, votingEndsAt, resolutionDeadline, status)
    const resultEnum = onChainMarket[5];
    const resultMap: Record<number, "YES" | "NO" | "INVALID"> = {
      1: "YES",
      2: "NO",
      3: "INVALID",
    };

    const result = resultMap[resultEnum];

    await db
      .update(DB_SCHEMA.market)
      .set({
        status: result === "INVALID" ? "CANCELLED" : "SETTLED",
        result: result ?? null,
        resolvedAt: new Date(),
      })
      .where(eq(DB_SCHEMA.market.onChainMarketId, onChainMarketId));

    logger.info(
      { onChainMarketId, result },
      "Indexed MarketResolved"
    );
  }

  async function handleTotalsDecrypted(log: Log): Promise<void> {
    const marketIdTopic = log.topics[1];
    if (!marketIdTopic) {
      return;
    }

    const onChainMarketId = Number(BigInt(marketIdTopic));

    // Read decrypted totals from chain
    const onChainMarket = await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "getMarket",
      args: [BigInt(onChainMarketId)],
    });

    // decryptedYesTotal at index 7, decryptedNoTotal at index 8
    const decryptedYesTotal = Number(onChainMarket[7]);
    const decryptedNoTotal = Number(onChainMarket[8]);

    await db
      .update(DB_SCHEMA.market)
      .set({ decryptedYesTotal, decryptedNoTotal })
      .where(eq(DB_SCHEMA.market.onChainMarketId, onChainMarketId));

    logger.info(
      { onChainMarketId, decryptedYesTotal, decryptedNoTotal },
      "Indexed TotalsDecrypted"
    );
  }

  async function handlePayoutClaimed(log: Log): Promise<void> {
    const marketIdTopic = log.topics[1];
    const userTopic = log.topics[2];

    if (!marketIdTopic || !userTopic) {
      return;
    }

    const onChainMarketId = Number(BigInt(marketIdTopic));
    const userAddress = `0x${userTopic.slice(26)}`.toLowerCase();

    // Find market
    const markets = await db
      .select()
      .from(DB_SCHEMA.market)
      .where(eq(DB_SCHEMA.market.onChainMarketId, onChainMarketId))
      .limit(1);

    const market = markets[0];
    if (!market) {
      return;
    }

    // Update bet as claimed
    await db
      .update(DB_SCHEMA.bet)
      .set({ claimed: true })
      .where(
        eq(DB_SCHEMA.bet.marketId, market.id)
      );

    logger.info(
      { onChainMarketId, userAddress },
      "Indexed PayoutClaimed"
    );
  }

  async function processLogs(fromBlock: bigint, toBlock: bigint): Promise<void> {
    const logs = await publicClient.getLogs({
      address: contracts.mishaMarket,
      fromBlock,
      toBlock,
    });

    for (const log of logs) {
      const eventSig = log.topics[0];
      if (!eventSig) {
        continue;
      }

      try {
        if (eventSig === EVENT_TOPICS.MarketCreated) {
          await handleMarketCreated(log);
        } else if (eventSig === EVENT_TOPICS.BetPlaced) {
          await handleBetPlaced(log);
        } else if (eventSig === EVENT_TOPICS.MarketResolved) {
          await handleMarketResolved(log);
        } else if (eventSig === EVENT_TOPICS.TotalsDecrypted) {
          await handleTotalsDecrypted(log);
        } else if (eventSig === EVENT_TOPICS.PayoutClaimed) {
          await handlePayoutClaimed(log);
        }
      } catch (error) {
        logger.error(
          { error, txHash: log.transactionHash, eventSig },
          "Error processing event"
        );
      }
    }
  }

  async function poll(): Promise<void> {
    if (!running) {
      return;
    }

    try {
      const lastIndexed = await getLastIndexedBlock();
      const currentBlock = await publicClient.getBlockNumber();

      if (currentBlock <= lastIndexed) {
        return;
      }

      const fromBlock = lastIndexed + 1n;

      // Process in chunks to avoid large queries
      const MAX_BLOCK_RANGE = 2000n;
      const toBlock =
        currentBlock - fromBlock > MAX_BLOCK_RANGE
          ? fromBlock + MAX_BLOCK_RANGE
          : currentBlock;

      await processLogs(fromBlock, toBlock);
      await setLastIndexedBlock(toBlock);

      if (toBlock < currentBlock) {
        // More to catch up — poll again immediately
        setImmediate(() => poll());
        return;
      }
    } catch (error) {
      logger.error({ error }, "Indexer poll error");
    }

    // Schedule next poll
    if (running) {
      pollTimer = setTimeout(() => poll(), POLL_INTERVAL_MS);
    }
  }

  return {
    async start(): Promise<void> {
      running = true;
      logger.info(
        { contract: contracts.mishaMarket },
        "Market indexer starting"
      );
      await poll();
    },

    async close(): Promise<void> {
      running = false;
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      logger.info("Market indexer stopped");
    },
  };
}

function getEventTopic(signature: string): `0x${string}` {
  return keccak256(toHex(signature));
}

// Precompute event topics
const EVENT_TOPICS = {
  MarketCreated: getEventTopic("MarketCreated(uint256,string,string,uint64,uint64)"),
  BetPlaced: getEventTopic("BetPlaced(uint256,address)"),
  MarketResolved: getEventTopic("MarketResolved(uint256,uint8)"),
  TotalsDecrypted: getEventTopic("TotalsDecrypted(uint256,uint64,uint64)"),
  PayoutClaimed: getEventTopic("PayoutClaimed(uint256,address)"),
} as const;
