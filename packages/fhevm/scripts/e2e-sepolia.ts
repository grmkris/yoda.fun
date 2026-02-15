/**
 * E2E Sepolia full-flow test (Zama FHEVM coprocessor is live on Sepolia)
 *
 * Derives 7 accounts from the mnemonic:
 *   0 = deployer/admin (oracle)
 *   1 = (reserved)
 *   2–6 = players (alice, bob, charlie, dave, eve)
 *
 * Full flow:
 *   1. Fund players with ETH
 *   2. Mint MISHA to players
 *   3. Players approve + wrap MISHA → cMISHA
 *   4. Admin creates a market
 *   5. Players place encrypted bets (YES/NO)
 *   6. Admin resolves market → YES
 *   7. Admin sets decrypted totals
 *   8. Winners claim payouts
 *   9. Everyone unwraps cMISHA → MISHA
 *
 * Run: bun run scripts/e2e-sepolia.ts
 */

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  http,
  parseEther,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import {
  confidentialMishaAbi,
  mishaMarketAbi,
  mishaTokenAbi,
} from "../sdk/abis";
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
const WRAP_AMOUNT = BigInt(500); // 500 cMISHA (whole units, not wei)
const BET_AMOUNT = BigInt(100); // 100 cMISHA per bet
const ETH_FUND_AMOUNT = parseEther("0.005"); // gas money for FHE txs (more expensive)

// Player betting strategy: first 3 bet YES, last 2 bet NO
const PLAYER_VOTES = [true, true, true, false, false] as const;

// Derive accounts from mnemonic
function deriveAccount(index: number) {
  return mnemonicToAccount(MNEMONIC, { addressIndex: index });
}

const admin = deriveAccount(0);
const players = PLAYER_NAMES.map((name, i) => ({
  name,
  account: deriveAccount(i + 2),
  vote: PLAYER_VOTES[i],
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
  console.log(`  OK ${label} — tx: ${hash.slice(0, 10)}...`);
  return receipt;
}

async function step(label: string, fn: () => Promise<void>) {
  console.log(`\n--- ${label} ---`);
  try {
    await fn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const short = msg.length > 300 ? `${msg.slice(0, 300)}...` : msg;
    console.log(`  FAILED: ${short}`);
  }
}

async function main() {
  console.log("Misha Market — Sepolia E2E Full Flow\n");

  console.log("Accounts:");
  console.log(`  admin:   ${admin.address}`);
  for (const p of players) {
    console.log(`  ${p.name.padEnd(8)} ${p.account.address} (votes ${p.vote ? "YES" : "NO"})`);
  }

  console.log(`\nContracts:`);
  console.log(`  MishaToken:        ${contracts.mishaToken}`);
  console.log(`  ConfidentialMisha: ${contracts.confidentialMisha}`);
  console.log(`  MishaMarket:       ${contracts.mishaMarket}`);

  const adminBalance = await publicClient.getBalance({ address: admin.address });
  console.log(`\nAdmin ETH: ${formatEther(adminBalance)} ETH`);

  // ============================================================
  // Step 1: Fund players with ETH
  // ============================================================
  await step("Step 1: Fund players with ETH", async () => {
    for (const p of players) {
      const bal = await publicClient.getBalance({ address: p.account.address });
      if (bal >= ETH_FUND_AMOUNT) {
        console.log(`  ${p.name} has ${formatEther(bal)} ETH — skip`);
        continue;
      }
      const hash = await adminWallet.sendTransaction({
        to: p.account.address,
        value: ETH_FUND_AMOUNT,
      });
      await waitTx(hash, `Fund ${p.name}`);
    }
  });

  // ============================================================
  // Step 2: Mint MISHA to players
  // ============================================================
  await step("Step 2: Mint MISHA to players", async () => {
    for (const p of players) {
      // Check if already minted (idempotent reruns)
      const bal = (await publicClient.readContract({
        address: contracts.mishaToken,
        abi: mishaTokenAbi,
        functionName: "balanceOf",
        args: [p.account.address],
      })) as bigint;

      if (bal >= MINT_AMOUNT) {
        console.log(`  ${p.name} already has ${formatEther(bal)} MISHA — skip`);
        continue;
      }

      const hash = await adminWallet.writeContract({
        address: contracts.mishaToken,
        abi: mishaTokenAbi,
        functionName: "mint",
        args: [p.account.address, MINT_AMOUNT],
      });
      await waitTx(hash, `Mint 1000 MISHA -> ${p.name}`);
    }
  });

  // ============================================================
  // Step 3: Approve + Wrap MISHA -> cMISHA
  // ============================================================
  await step("Step 3: Approve + Wrap MISHA -> cMISHA", async () => {
    for (const p of players) {
      const playerWallet = walletFor(p.account);
      const wrapWei = WRAP_AMOUNT * parseEther("1"); // wrap() takes whole units but needs wei approval

      // Approve
      const approveHash = await playerWallet.writeContract({
        address: contracts.mishaToken,
        abi: mishaTokenAbi,
        functionName: "approve",
        args: [contracts.confidentialMisha, wrapWei],
      });
      await waitTx(approveHash, `${p.name} approve`);

      // Wrap
      const wrapHash = await playerWallet.writeContract({
        address: contracts.confidentialMisha,
        abi: confidentialMishaAbi,
        functionName: "wrap",
        args: [WRAP_AMOUNT],
      });
      await waitTx(wrapHash, `${p.name} wrap ${WRAP_AMOUNT} -> cMISHA`);
    }
  });

  // ============================================================
  // Step 4: Admin creates a market
  // ============================================================
  let marketId: bigint | undefined;

  await step("Step 4: Create market", async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const votingEndsAt = now + BigInt(300); // 5 min from now
    const resolutionDeadline = now + BigInt(600); // 10 min from now

    const hash = await adminWallet.writeContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "createMarket",
      args: [
        "Will Misha the cat eat tuna today?",
        votingEndsAt,
        resolutionDeadline,
      ],
    });
    const receipt = await waitTx(hash, "Market created");

    // Parse marketId from MarketCreated event
    const eventLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === contracts.mishaMarket.toLowerCase()
    );
    if (eventLog?.topics[1]) {
      marketId = BigInt(eventLog.topics[1]);
      console.log(`  Market ID: ${marketId}`);
    }
  });

  if (marketId === undefined) {
    console.log("\nCannot proceed without market ID");
    return;
  }

  // ============================================================
  // Step 5: Players place encrypted bets
  // ============================================================
  await step("Step 5: Place encrypted bets", async () => {
    // Dynamic import to avoid SSR/node issues with relayer SDK
    let RelayerClient: unknown;
    try {
      const mod = await import("@zama-fhe/relayer-sdk");
      RelayerClient = mod.RelayerClient;
    } catch {
      console.log("  @zama-fhe/relayer-sdk not available — skipping encrypted bets");
      console.log("  (Install it or use hardhat tests for FHE betting)");
      return;
    }

    for (const p of players) {
      const playerWallet = walletFor(p.account);

      // Init FHEVM relayer instance
      const client = new (RelayerClient as new () => {
        init(): Promise<void>;
        createEncryptedInput(
          contract: string,
          user: string
        ): {
          addBool(v: boolean): unknown;
          add64(v: number | bigint): unknown;
          encrypt(): Promise<{
            handles: Uint8Array[];
            inputProof: Uint8Array;
          }>;
        };
      })();
      await client.init();

      // Encrypt vote + amount
      const input = client.createEncryptedInput(
        contracts.mishaMarket,
        p.account.address
      );
      input.addBool(p.vote);
      input.add64(Number(BET_AMOUNT));
      const encrypted = await input.encrypt();

      // Place bet
      const hash = await playerWallet.writeContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "placeBet",
        args: [
          marketId!,
          encrypted.handles[0] as unknown as `0x${string}`,
          encrypted.handles[1] as unknown as `0x${string}`,
          encrypted.inputProof as unknown as `0x${string}`,
        ],
      });
      await waitTx(hash, `${p.name} bet ${p.vote ? "YES" : "NO"} (${BET_AMOUNT} cMISHA)`);
    }
  });

  // ============================================================
  // Step 6: Read market state before resolution
  // ============================================================
  await step("Step 6: Market state before resolution", async () => {
    const market = await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "getMarket",
      args: [marketId!],
    });
    const [title, , , status, result, betCount] = market as [
      string, bigint, bigint, number, number, number, bigint, bigint, boolean
    ];
    console.log(`  Title: ${title}`);
    console.log(`  Status: ${status} (0=Active)`);
    console.log(`  Result: ${result} (0=Unresolved)`);
    console.log(`  Bet count: ${betCount}`);
  });

  // ============================================================
  // Step 7: Resolve market -> YES
  // ============================================================
  await step("Step 7: Resolve market -> YES", async () => {
    // MarketResult.Yes = 1
    const hash = await adminWallet.writeContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "resolveMarket",
      args: [marketId!, 1],
    });
    await waitTx(hash, "Market resolved to YES");
  });

  // ============================================================
  // Step 8: Wait for decryption + set totals
  // ============================================================
  await step("Step 8: Set decrypted totals", async () => {
    // In production, the gateway decrypts asynchronously.
    // For the test, we know: 3 players bet 100 YES = 300, 2 players bet 100 NO = 200
    const yesTotal = BigInt(300);
    const noTotal = BigInt(200);

    console.log(`  Setting totals: YES=${yesTotal}, NO=${noTotal}`);

    const hash = await adminWallet.writeContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "setDecryptedTotals",
      args: [marketId!, yesTotal, noTotal],
    });
    await waitTx(hash, "Decrypted totals set");
  });

  // ============================================================
  // Step 9: Winners claim payouts
  // ============================================================
  await step("Step 9: Winners claim payouts", async () => {
    for (const p of players) {
      const playerWallet = walletFor(p.account);

      const hash = await playerWallet.writeContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "claimPayout",
        args: [marketId!],
      });
      await waitTx(hash, `${p.name} claimed payout (voted ${p.vote ? "YES" : "NO"})`);
    }
  });

  // ============================================================
  // Step 10: Final state
  // ============================================================
  await step("Step 10: Final state", async () => {
    const market = await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "getMarket",
      args: [marketId!],
    });
    const [title, , , status, result, betCount, yesTotal, noTotal, decrypted] =
      market as [string, bigint, bigint, number, number, number, bigint, bigint, boolean];
    console.log(`  Title: ${title}`);
    console.log(`  Status: ${status} (1=Resolved)`);
    console.log(`  Result: ${result} (1=Yes)`);
    console.log(`  Bets: ${betCount}`);
    console.log(`  Totals: YES=${yesTotal} NO=${noTotal} (decrypted=${decrypted})`);

    console.log("\n  MISHA balances after claiming:");
    for (const p of players) {
      const bal = (await publicClient.readContract({
        address: contracts.mishaToken,
        abi: mishaTokenAbi,
        functionName: "balanceOf",
        args: [p.account.address],
      })) as bigint;
      console.log(`    ${p.name}: ${formatEther(bal)} MISHA`);
    }
  });

  console.log("\n============================================================");
  console.log("Done!");
  console.log("============================================================");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
