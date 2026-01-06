/**
 * One-time script to register the Yoda agent on ERC-8004 Identity Registry (Base Sepolia)
 *
 * Prerequisites:
 * 1. Set YODA_AGENT_PRIVATE_KEY env var (wallet that will own the agent NFT)
 * 2. Fund wallet with Base Sepolia ETH for gas
 *
 * Usage:
 *   bun run scripts/register-agent.ts
 *
 * After registration:
 * 1. Copy the agentId from output
 * 2. Set YODA_AGENT_ID env var
 * 3. The agent identity will be inserted into the database
 */

import { createDb, DB_SCHEMA } from "@yoda.fun/db";
import { createERC8004Client, ERC8004_CONTRACTS } from "@yoda.fun/erc8004";
import { createLogger } from "@yoda.fun/logger";
import { env } from "../src/env";

const logger = createLogger({
  level: "debug",
  environment: "dev",
  appName: "register-agent",
});

// Agent metadata (host this JSON somewhere accessible)
const AGENT_CARD = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "Yoda",
  description:
    "AI prediction market agent for yoda.fun. Creates viral markets based on trending topics and resolves them using AI-powered web research.",
  image: "https://yoda.fun/yoda-agent.png",
  endpoints: [
    {
      name: "MCP",
      endpoint: "https://api.yoda.fun/mcp",
      version: "2024-11-05",
    },
  ],
  supportedTrust: ["reputation"],
};

async function main() {
  if (!env.YODA_AGENT_PRIVATE_KEY) {
    console.error("ERROR: YODA_AGENT_PRIVATE_KEY env var not set");
    console.error(
      "Generate a new wallet and set the private key (0x prefixed 64 hex chars)"
    );
    process.exit(1);
  }

  if (!env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL env var not set");
    process.exit(1);
  }

  const db = createDb({
    dbData: { type: "pg", databaseUrl: env.DATABASE_URL },
  });

  // Check if agent already registered
  const existingAgents = await db
    .select()
    .from(DB_SCHEMA.agentIdentity)
    .limit(1);

  if (existingAgents.length > 0) {
    const existing = existingAgents[0];
    console.log("Agent already registered in database:");
    console.log(`  Agent ID: ${existing?.agentId}`);
    console.log(`  Owner: ${existing?.ownerAddress}`);
    console.log(`  Chain ID: ${existing?.chainId}`);
    console.log(
      "\nTo re-register, delete the record from agent_identity table first"
    );
    process.exit(0);
  }

  const client = createERC8004Client({
    privateKey: env.YODA_AGENT_PRIVATE_KEY,
    logger,
  });

  console.log("=== ERC-8004 Agent Registration ===\n");
  console.log(
    `Network: Base Sepolia (Chain ID: ${ERC8004_CONTRACTS.baseSepolia.chainId})`
  );
  console.log(
    `Identity Registry: ${ERC8004_CONTRACTS.baseSepolia.identityRegistry}`
  );
  console.log(`Owner Wallet: ${client.getAddress()}`);
  console.log("");

  // For now, use a placeholder token URI
  // In production, host the AGENT_CARD JSON on IPFS or a CDN
  const tokenUri = "https://yoda.fun/agent-card.json";

  console.log("Agent Card (to be hosted at tokenUri):");
  console.log(JSON.stringify(AGENT_CARD, null, 2));
  console.log(`\nToken URI: ${tokenUri}`);
  console.log("");

  console.log("Registering agent on-chain...");

  try {
    const agentId = await client.registerAgent(tokenUri);

    console.log("\n=== Registration Successful! ===\n");
    console.log(`Agent ID: ${agentId}`);
    console.log(`Owner: ${client.getAddress()}`);
    console.log(
      `Chain: Base Sepolia (${ERC8004_CONTRACTS.baseSepolia.chainId})`
    );

    // Insert into database
    console.log("\nSaving to database...");
    await db.insert(DB_SCHEMA.agentIdentity).values({
      agentId: Number(agentId),
      ownerAddress: client.getAddress(),
      tokenUri,
      chainId: ERC8004_CONTRACTS.baseSepolia.chainId,
      name: "Yoda",
      description: AGENT_CARD.description,
    });

    console.log("Database record created.");

    console.log("\n=== Next Steps ===\n");
    console.log("1. Add to your .env file:");
    console.log(`   YODA_AGENT_ID=${agentId}`);
    console.log("");
    console.log(`2. Host the agent card JSON at: ${tokenUri}`);
    console.log("   (or update tokenUri with: setAgentUri)");
    console.log("");
    console.log("3. View your agent on 8004scan.io:");
    console.log(
      `   https://8004scan.io/agent/eip155:${ERC8004_CONTRACTS.baseSepolia.chainId}:${ERC8004_CONTRACTS.baseSepolia.identityRegistry}:${agentId}`
    );
  } catch (error) {
    console.error("\nRegistration failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
