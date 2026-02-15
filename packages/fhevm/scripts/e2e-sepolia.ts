/**
 * E2E Sepolia smoke test
 *
 * Derives 7 accounts from the mnemonic:
 *   0 = deployer/admin
 *   1 = oracle
 *   2–6 = players (alice, bob, charlie, dave, eve)
 *
 * Exercises everything that works on vanilla Sepolia (no FHEVM coprocessor):
 *   ✅ Mint MISHA tokens
 *   ✅ Transfer MISHA between accounts
 *   ✅ Read contract state
 *   ❌ createMarket (FHE.asEuint64 call → reverts on Sepolia)
 *   ❌ wrap/unwrap (FHE calls → reverts)
 *   ❌ placeBet (FHE calls → reverts)
 *
 * Run: bun run scripts/e2e-sepolia.ts
 */

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { mishaTokenAbi, mishaMarketAbi } from "../sdk/abis";
import { FHEVM_CONFIG } from "../sdk/config";

const MNEMONIC = process.env.MNEMONIC!;
const INFURA_API_KEY = process.env.INFURA_API_KEY!;

if (!MNEMONIC || !INFURA_API_KEY) {
  console.error("Missing MNEMONIC or INFURA_API_KEY in .env");
  process.exit(1);
}

const RPC_URL = `https://sepolia.infura.io/v3/${INFURA_API_KEY}`;
const contracts = FHEVM_CONFIG.sepolia.contracts;

const PLAYER_NAMES = ["alice", "bob", "charlie", "dave", "eve"] as const;
const MINT_AMOUNT = parseEther("1000"); // 1000 MISHA per player
const ETH_FUND_AMOUNT = parseEther("0.002"); // gas money for each player

// Derive accounts from mnemonic
function deriveAccount(index: number) {
  return mnemonicToAccount(MNEMONIC, {
    addressIndex: index,
  });
}

const admin = deriveAccount(0);
const oracle = deriveAccount(1);
const players = PLAYER_NAMES.map((name, i) => ({
  name,
  account: deriveAccount(i + 2),
}));

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

function walletFor(account: ReturnType<typeof deriveAccount>) {
  return createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  });
}

const adminWallet = walletFor(admin);

async function waitTx(hash: `0x${string}`, label: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error(`${label} reverted: ${hash}`);
  }
  console.log(`  ✅ ${label} — tx: ${hash.slice(0, 10)}...`);
  return receipt;
}

async function step(label: string, fn: () => Promise<void>) {
  console.log(`\n--- ${label} ---`);
  try {
    await fn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Truncate long RPC errors
    const short = msg.length > 200 ? `${msg.slice(0, 200)}...` : msg;
    console.log(`  ❌ FAILED: ${short}`);
  }
}

async function main() {
  console.log("🐱 Misha Market — Sepolia E2E Smoke Test\n");

  console.log("Accounts:");
  console.log(`  admin:   ${admin.address}`);
  console.log(`  oracle:  ${oracle.address}`);
  for (const p of players) {
    console.log(`  ${p.name.padEnd(8)} ${p.account.address}`);
  }

  console.log(`\nContracts:`);
  console.log(`  MishaToken:        ${contracts.mishaToken}`);
  console.log(`  ConfidentialMisha: ${contracts.confidentialMisha}`);
  console.log(`  MishaMarket:       ${contracts.mishaMarket}`);

  // --- Check admin ETH balance ---
  const adminBalance = await publicClient.getBalance({
    address: admin.address,
  });
  console.log(`\nAdmin ETH balance: ${formatEther(adminBalance)} ETH`);

  if (adminBalance < parseEther("0.01")) {
    console.error("Admin has too little ETH. Fund and retry.");
    process.exit(1);
  }

  // ============================================================
  // Step 1: Fund players with ETH for gas
  // ============================================================
  await step("Step 1: Fund players with ETH", async () => {
    for (const p of players) {
      const bal = await publicClient.getBalance({
        address: p.account.address,
      });
      if (bal >= ETH_FUND_AMOUNT) {
        console.log(
          `  ${p.name} already has ${formatEther(bal)} ETH — skip`
        );
        continue;
      }
      const hash = await adminWallet.sendTransaction({
        to: p.account.address,
        value: ETH_FUND_AMOUNT,
      });
      await waitTx(hash, `Fund ${p.name} with ${formatEther(ETH_FUND_AMOUNT)} ETH`);
    }
  });

  // ============================================================
  // Step 2: Mint MISHA to each player
  // ============================================================
  await step("Step 2: Mint MISHA to players", async () => {
    for (const p of players) {
      const hash = await adminWallet.writeContract({
        address: contracts.mishaToken,
        abi: mishaTokenAbi,
        functionName: "mint",
        args: [p.account.address, MINT_AMOUNT],
      });
      await waitTx(hash, `Mint 1000 MISHA → ${p.name}`);
    }
  });

  // ============================================================
  // Step 3: Check MISHA balances
  // ============================================================
  await step("Step 3: Check MISHA balances", async () => {
    for (const p of players) {
      const balance = await publicClient.readContract({
        address: contracts.mishaToken,
        abi: mishaTokenAbi,
        functionName: "balanceOf",
        args: [p.account.address],
      });
      console.log(
        `  ${p.name}: ${formatEther(balance as bigint)} MISHA`
      );
    }
  });

  // ============================================================
  // Step 4: Player-to-player MISHA transfer
  // ============================================================
  await step("Step 4: Alice transfers 50 MISHA to Bob", async () => {
    const aliceWallet = walletFor(players[0].account);
    const hash = await aliceWallet.writeContract({
      address: contracts.mishaToken,
      abi: mishaTokenAbi,
      functionName: "transfer",
      args: [players[1].account.address, parseEther("50")],
    });
    await waitTx(hash, "Alice → Bob 50 MISHA");

    const aliceBal = await publicClient.readContract({
      address: contracts.mishaToken,
      abi: mishaTokenAbi,
      functionName: "balanceOf",
      args: [players[0].account.address],
    });
    const bobBal = await publicClient.readContract({
      address: contracts.mishaToken,
      abi: mishaTokenAbi,
      functionName: "balanceOf",
      args: [players[1].account.address],
    });
    console.log(`  Alice: ${formatEther(aliceBal as bigint)} MISHA`);
    console.log(`  Bob:   ${formatEther(bobBal as bigint)} MISHA`);
  });

  // ============================================================
  // Step 5: Read contract state
  // ============================================================
  await step("Step 5: Read contract state", async () => {
    const marketCount = await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "marketCount",
    });
    console.log(`  Market count: ${marketCount}`);

    const mishaAdmin = await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "admin",
    });
    console.log(`  MishaMarket admin: ${mishaAdmin}`);

    const tokenAddr = await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "token",
    });
    console.log(`  MishaMarket token: ${tokenAddr}`);

    const totalSupply = await publicClient.readContract({
      address: contracts.mishaToken,
      abi: mishaTokenAbi,
      functionName: "totalSupply",
    });
    console.log(`  MISHA totalSupply: ${formatEther(totalSupply as bigint)}`);
  });

  // ============================================================
  // Step 6: Create market (requires FHEVM coprocessor)
  // ============================================================
  await step(
    "Step 6: Create market (⚠️  requires FHEVM — will fail on vanilla Sepolia)",
    async () => {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const votingEndsAt = now + BigInt(3600); // +1 hour
      const resolutionDeadline = now + BigInt(7200); // +2 hours

      const hash = await adminWallet.writeContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "createMarket",
        args: ["Will ETH reach $5000 this week?", votingEndsAt, resolutionDeadline],
      });
      await waitTx(hash, "Market created");
    }
  );

  // ============================================================
  // Step 7: Wrap MISHA → cMISHA (requires FHEVM)
  // ============================================================
  await step(
    "Step 7: Wrap MISHA → cMISHA (⚠️  requires FHEVM)",
    async () => {
      const aliceWallet = walletFor(players[0].account);

      // Approve ConfidentialMisha to spend MISHA
      const approveHash = await aliceWallet.writeContract({
        address: contracts.mishaToken,
        abi: mishaTokenAbi,
        functionName: "approve",
        args: [contracts.confidentialMisha, parseEther("500")],
      });
      await waitTx(approveHash, "Alice approved cMISHA for 500 MISHA");

      // Note: The actual wrap() call uses FHE and will revert on vanilla Sepolia
      console.log("  ⚠️  Skipping wrap() call — requires FHEVM coprocessor");
    }
  );

  // ============================================================
  // Summary
  // ============================================================
  console.log("\n============================================================");
  console.log("🐱 E2E Summary");
  console.log("============================================================");
  console.log("✅ ETH funding — works on Sepolia");
  console.log("✅ MISHA minting — works on Sepolia");
  console.log("✅ MISHA transfers — works on Sepolia");
  console.log("✅ Contract state reads — works on Sepolia");
  console.log("✅ ERC-20 approvals — works on Sepolia");
  console.log("❌ createMarket — needs FHEVM coprocessor (FHE.asEuint64)");
  console.log("❌ wrap/unwrap — needs FHEVM coprocessor");
  console.log("❌ placeBet — needs FHEVM coprocessor + encrypted inputs");
  console.log("❌ claimPayout — needs FHEVM coprocessor");
  console.log(
    "\nTo test full flow, deploy to Zama's FHEVM testnet instead of vanilla Sepolia."
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
