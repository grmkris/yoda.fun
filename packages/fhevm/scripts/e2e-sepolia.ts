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
 *   4. Players set MishaMarket as operator (ERC-7984)
 *   5. Admin creates a market
 *   6. Players place encrypted bets (YES/NO)
 *   7. Admin resolves market → YES
 *   8. KMS-verified decryption → submit proof on-chain
 *   9. Winners claim payouts
 *  10. Final state
 *
 * Run: bun run scripts/e2e-sepolia.ts
 */

import {
  bytesToHex,
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import {
  confidentialMishaAbi,
  createFhevmInstance,
  encryptBet,
  FHEVM_CONFIG,
  mishaMarketAbi,
  mishaTokenAbi,
} from "../sdk";

const MNEMONIC = process.env.MNEMONIC ?? "";
const INFURA_API_KEY = process.env.INFURA_API_KEY ?? "";

if (!(MNEMONIC && INFURA_API_KEY)) {
  console.error("Missing MNEMONIC or INFURA_API_KEY in .env");
  process.exit(1);
}

const RPC_URL = `https://sepolia.infura.io/v3/${INFURA_API_KEY}`;
const contracts = FHEVM_CONFIG.sepolia.contracts;

const PLAYER_NAMES = ["alice", "bob", "charlie", "dave", "eve"] as const;
const MINT_AMOUNT = parseEther("1000"); // 1000 MISHA per player
const WRAP_AMOUNT = parseEther("500"); // 500 MISHA in wei → wrap(to, weiAmount)
const CMISHA_DECIMALS = 6;
const BET_AMOUNT = 100 * 10 ** CMISHA_DECIMALS; // 100 cMISHA in 6-decimal units
const ETH_FUND_AMOUNT = parseEther("0.05"); // gas money for FHE txs (need more for coprocessor ops)
const MAX_UINT48 = 281_474_976_710_655; // 2^48 - 1

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
    const short = msg.length > 1500 ? `${msg.slice(0, 1500)}...` : msg;
    console.log(`  FAILED: ${short}`);
  }
}

async function main() {
  console.log("Misha Market — Sepolia E2E Full Flow (ERC-7984)\n");

  console.log("Accounts:");
  console.log(`  admin:   ${admin.address}`);
  for (const p of players) {
    console.log(
      `  ${p.name.padEnd(8)} ${p.account.address} (votes ${p.vote ? "YES" : "NO"})`
    );
  }

  console.log("\nContracts:");
  console.log(`  MishaToken:        ${contracts.mishaToken}`);
  console.log(`  ConfidentialMisha: ${contracts.confidentialMisha}`);
  console.log(`  MishaMarket:       ${contracts.mishaMarket}`);

  const adminBalance = await publicClient.getBalance({
    address: admin.address,
  });
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
  // Step 3: Approve + Wrap MISHA -> cMISHA (ERC-7984 wrap(to, weiAmount))
  // ============================================================
  await step("Step 3: Approve + Wrap MISHA -> cMISHA", async () => {
    for (const p of players) {
      const playerWallet = walletFor(p.account);

      // Approve wrapper to pull MISHA wei
      const approveHash = await playerWallet.writeContract({
        address: contracts.mishaToken,
        abi: mishaTokenAbi,
        functionName: "approve",
        args: [contracts.confidentialMisha, WRAP_AMOUNT],
      });
      await waitTx(approveHash, `${p.name} approve`);

      // Wrap: wrap(to, weiAmount)
      const wrapHash = await playerWallet.writeContract({
        address: contracts.confidentialMisha,
        abi: confidentialMishaAbi,
        functionName: "wrap",
        args: [p.account.address, WRAP_AMOUNT],
      });
      await waitTx(wrapHash, `${p.name} wrap 500 MISHA -> cMISHA`);
    }
  });

  // ============================================================
  // Step 4: Set MishaMarket as operator (ERC-7984)
  // ============================================================
  await step("Step 4: Set MishaMarket as operator", async () => {
    for (const p of players) {
      const playerWallet = walletFor(p.account);

      const hash = await playerWallet.writeContract({
        address: contracts.confidentialMisha,
        abi: confidentialMishaAbi,
        functionName: "setOperator",
        args: [contracts.mishaMarket, MAX_UINT48],
      });
      await waitTx(hash, `${p.name} setOperator(mishaMarket)`);
    }
  });

  // ============================================================
  // Step 5: Admin creates a market
  // ============================================================
  let marketId: bigint | undefined;

  await step("Step 5: Create market", async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const votingEndsAt = now + BigInt(300); // 5 min from now
    const resolutionDeadline = now + BigInt(600); // 10 min from now

    const hash = await adminWallet.writeContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "createMarket",
      args: [
        "Will Misha the cat eat tuna today?",
        "",
        votingEndsAt,
        resolutionDeadline,
      ],
    });
    const receipt = await waitTx(hash, "Market created");

    // Parse marketId from MarketCreated event
    const eventLog = receipt.logs.find(
      (log) => log.address.toLowerCase() === contracts.mishaMarket.toLowerCase()
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
  const mid = marketId;

  // ============================================================
  // Step 6: Players place encrypted bets (amounts in 6-decimal units)
  // ============================================================
  await step("Step 6: Place encrypted bets", async () => {
    const instance = await createFhevmInstance({
      network: RPC_URL,
    });

    for (const p of players) {
      const playerWallet = walletFor(p.account);

      const encrypted = await encryptBet(
        instance,
        contracts.mishaMarket,
        p.account.address,
        p.vote,
        BET_AMOUNT
      );

      const hash = await playerWallet.writeContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "placeBet",
        args: [
          mid,
          bytesToHex(encrypted.encryptedVote),
          bytesToHex(encrypted.encryptedAmount),
          bytesToHex(encrypted.inputProof),
        ],
        gas: 5_000_000n,
      });
      await waitTx(hash, `${p.name} bet ${p.vote ? "YES" : "NO"} (100 cMISHA)`);
    }
  });

  // ============================================================
  // Step 7: Read market state before resolution
  // ============================================================
  await step("Step 7: Market state before resolution", async () => {
    const market = await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "getMarket",
      args: [mid],
    });
    const [title, , , , status, result, betCount] = market as [
      string,
      string,
      bigint,
      bigint,
      number,
      number,
      number,
      bigint,
      bigint,
      boolean,
    ];
    console.log(`  Title: ${title}`);
    console.log(`  Status: ${status} (0=Active)`);
    console.log(`  Result: ${result} (0=Unresolved)`);
    console.log(`  Bet count: ${betCount}`);
  });

  // ============================================================
  // Step 8: Resolve market -> YES
  // ============================================================
  await step("Step 8: Resolve market -> YES", async () => {
    // MarketResult.Yes = 1
    const hash = await adminWallet.writeContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "resolveMarket",
      args: [mid, 1],
    });
    await waitTx(hash, "Market resolved to YES");
  });

  // ============================================================
  // Step 9: Get KMS-verified decryption + submit proof on-chain
  // ============================================================
  await step("Step 9: Submit verified decrypted totals", async () => {
    // Read encrypted handles from contract
    const handles = (await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "getMarketHandles",
      args: [mid],
    })) as [`0x${string}`, `0x${string}`];

    console.log(`  YES handle: ${handles[0].slice(0, 18)}...`);
    console.log(`  NO handle:  ${handles[1].slice(0, 18)}...`);

    // Use Relayer SDK to get KMS-verified decryption
    const instance = await createFhevmInstance({ network: RPC_URL });
    const results = await instance.publicDecrypt(handles);

    const values = Object.values(results.clearValues);
    console.log(`  Decrypted: YES=${values[0]} NO=${values[1]}`);

    // Submit verified proof on-chain (permissionless — anyone can relay)
    const hash = await adminWallet.writeContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "submitVerifiedTotals",
      args: [mid, results.abiEncodedClearValues, results.decryptionProof],
    });
    await waitTx(hash, "Verified totals submitted with KMS proof");
  });

  // ============================================================
  // Step 10: Winners claim payouts
  // ============================================================
  await step("Step 10: Winners claim payouts", async () => {
    for (const p of players) {
      const playerWallet = walletFor(p.account);

      const hash = await playerWallet.writeContract({
        address: contracts.mishaMarket,
        abi: mishaMarketAbi,
        functionName: "claimPayout",
        args: [mid],
        gas: 5_000_000n,
      });
      await waitTx(
        hash,
        `${p.name} claimed payout (voted ${p.vote ? "YES" : "NO"})`
      );
    }
  });

  // ============================================================
  // Step 11: Final state
  // ============================================================
  await step("Step 11: Final state", async () => {
    const market = await publicClient.readContract({
      address: contracts.mishaMarket,
      abi: mishaMarketAbi,
      functionName: "getMarket",
      args: [mid],
    });
    const [
      title,
      ,
      ,
      ,
      status,
      result,
      betCount,
      yesTotal,
      noTotal,
      decrypted,
    ] = market as [
      string,
      string,
      bigint,
      bigint,
      number,
      number,
      number,
      bigint,
      bigint,
      boolean,
    ];
    console.log(`  Title: ${title}`);
    console.log(`  Status: ${status} (1=Resolved)`);
    console.log(`  Result: ${result} (1=Yes)`);
    console.log(`  Bets: ${betCount}`);
    console.log(
      `  Totals: YES=${yesTotal} NO=${noTotal} (decrypted=${decrypted})`
    );

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
