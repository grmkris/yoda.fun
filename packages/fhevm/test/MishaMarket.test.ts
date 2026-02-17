import type { ConfidentialMisha, MishaMarket, MishaToken } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

/// Convert whole tokens to wei (18 decimals)
const e = (n: number) => ethers.parseEther(n.toString());

/// cMISHA has 6 decimals — amounts in tests are whole cMISHA units
/// but the actual euint64 values are in 6-decimal units
const CMISHA_DECIMALS = 6;
const cMishaUnits = (n: number) => n * 10 ** CMISHA_DECIMALS;

/// ERC-7984 max uint48 for operator approval (never expires)
const MAX_UINT48 = 281474976710655;

interface Signers {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
}

async function deployFixture() {
  const tokenFactory = await ethers.getContractFactory("MishaToken");
  const token = (await tokenFactory.deploy()) as unknown as MishaToken;
  const tokenAddress = await token.getAddress();

  const wrapperFactory = await ethers.getContractFactory("ConfidentialMisha");
  const wrapper = (await wrapperFactory.deploy(
    tokenAddress
  )) as unknown as ConfidentialMisha;
  const wrapperAddress = await wrapper.getAddress();

  const marketFactory = await ethers.getContractFactory("MishaMarket");
  const market = (await marketFactory.deploy(
    wrapperAddress
  )) as unknown as MishaMarket;
  const marketAddress = await market.getAddress();

  return {
    token,
    tokenAddress,
    wrapper,
    wrapperAddress,
    market,
    marketAddress,
  };
}

function futureTimestamp(seconds: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}

/// Mint MISHA (wei) → approve wrapper → wrap(to, weiAmount) → setOperator for market
async function mintWrapAndApprove(
  token: MishaToken,
  wrapper: ConfidentialMisha,
  wrapperAddress: string,
  user: HardhatEthersSigner,
  marketAddress: string,
  amount: number
) {
  // Mint standard MISHA in wei
  await (await token.mint(user.address, e(amount))).wait();

  // Approve wrapper to pull wei
  await (await token.connect(user).approve(wrapperAddress, e(amount))).wait();

  // Wrap: wrap(to, weiAmount) — locks MISHA wei, mints cMISHA (6 decimal units)
  await (await wrapper.connect(user).wrap(user.address, e(amount))).wait();

  // Set MishaMarket as operator (ERC-7984 pattern, replaces approve+transferInternal)
  await (await wrapper.connect(user).setOperator(marketAddress, MAX_UINT48)).wait();
}

async function placeBet(
  market: MishaMarket,
  marketAddress: string,
  user: HardhatEthersSigner,
  marketId: number,
  vote: boolean,
  amount: number
) {
  const input = fhevm.createEncryptedInput(marketAddress, user.address);
  input.addBool(vote);
  input.add64(cMishaUnits(amount));
  const encrypted = await input.encrypt();

  await (
    await market
      .connect(user)
      .placeBet(
        marketId,
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      )
  ).wait();
}

async function getUserBalance(
  wrapper: ConfidentialMisha,
  wrapperAddress: string,
  user: HardhatEthersSigner
): Promise<bigint> {
  const encBalance = await wrapper.connect(user).confidentialBalanceOf(user.address);
  if (encBalance === ethers.ZeroHash) return 0n;
  return fhevm.userDecryptEuint(
    FhevmType.euint64,
    encBalance,
    wrapperAddress,
    user
  );
}

/// Get KMS-verified decryption proof and submit on-chain
async function verifyAndSubmitTotals(market: MishaMarket, marketId: number) {
  const [yesHandle, noHandle] = await market.getMarketHandles(marketId);
  const results = await fhevm.publicDecrypt([yesHandle, noHandle]);
  await (
    await market.submitVerifiedTotals(
      marketId,
      results.abiEncodedClearValues,
      results.decryptionProof
    )
  ).wait();
}

describe("MishaMarket", () => {
  let signers: Signers;
  let token: MishaToken;
  let wrapper: ConfidentialMisha;
  let wrapperAddress: string;
  let market: MishaMarket;
  let marketAddress: string;

  before(async () => {
    const ethSigners = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async () => {
    ({ token, wrapper, wrapperAddress, market, marketAddress } =
      await deployFixture());
  });

  describe("createMarket", () => {
    it("should create a market with correct params", async () => {
      const votingEnds = futureTimestamp(3600);
      const resolutionDeadline = futureTimestamp(7200);

      const tx = await market.createMarket(
        "Will ETH hit $5k?",
        "",
        votingEnds,
        resolutionDeadline
      );
      await tx.wait();

      const m = await market.getMarket(0);
      expect(m.title).to.eq("Will ETH hit $5k?");
      expect(m.votingEndsAt).to.eq(votingEnds);
      expect(m.resolutionDeadline).to.eq(resolutionDeadline);
      expect(m.status).to.eq(0); // Active
      expect(m.result).to.eq(0); // Unresolved
      expect(m.betCount).to.eq(0);
    });

    it("should reject non-admin", async () => {
      await expect(
        market
          .connect(signers.alice)
          .createMarket("test", "", futureTimestamp(3600), futureTimestamp(7200))
      ).to.be.revertedWithCustomError(market, "OnlyAdmin");
    });

    it("should increment marketCount", async () => {
      await market.createMarket(
        "Market 1",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );
      await market.createMarket(
        "Market 2",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );
      expect(await market.marketCount()).to.eq(2);
    });
  });

  describe("placeBet", () => {
    beforeEach(async () => {
      await market.createMarket(
        "Will Misha catch the laser?",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );

      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.alice,
        marketAddress,
        500
      );
      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.bob,
        marketAddress,
        500
      );
    });

    it("should accept encrypted YES bet", async () => {
      await placeBet(market, marketAddress, signers.alice, 0, true, 100);

      const m = await market.getMarket(0);
      expect(m.betCount).to.eq(1);
    });

    it("should accept encrypted NO bet", async () => {
      await placeBet(market, marketAddress, signers.bob, 0, false, 50);

      const m = await market.getMarket(0);
      expect(m.betCount).to.eq(1);
    });

    it("should deduct tokens from user", async () => {
      await placeBet(market, marketAddress, signers.alice, 0, true, 100);

      const balance = await getUserBalance(
        wrapper,
        wrapperAddress,
        signers.alice
      );
      // 500 MISHA wrapped = 500_000000 cMISHA units, bet 100_000000
      expect(balance).to.eq(BigInt(cMishaUnits(400)));
    });

    it("should reject double bet", async () => {
      await placeBet(market, marketAddress, signers.alice, 0, true, 100);

      await expect(
        placeBet(market, marketAddress, signers.alice, 0, false, 50)
      ).to.be.revertedWithCustomError(market, "AlreadyBet");
    });
  });

  describe("resolveMarket", () => {
    beforeEach(async () => {
      await market.createMarket(
        "Test market",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );
    });

    it("should resolve with YES", async () => {
      await market.resolveMarket(0, 1);

      const m = await market.getMarket(0);
      expect(m.status).to.eq(1); // Resolved
      expect(m.result).to.eq(1); // Yes
    });

    it("should cancel on Invalid", async () => {
      await market.resolveMarket(0, 3);

      const m = await market.getMarket(0);
      expect(m.status).to.eq(2); // Cancelled
      expect(m.result).to.eq(3); // Invalid
    });

    it("should reject non-admin", async () => {
      await expect(
        market.connect(signers.alice).resolveMarket(0, 1)
      ).to.be.revertedWithCustomError(market, "OnlyAdmin");
    });

    it("should reject resolving already resolved", async () => {
      await market.resolveMarket(0, 1);
      await expect(market.resolveMarket(0, 2)).to.be.revertedWithCustomError(
        market,
        "MarketNotActive"
      );
    });
  });

  describe("claimPayout — INVALID refund", () => {
    it("should refund all bets on Invalid result", async () => {
      await market.createMarket(
        "Refund test",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );
      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.alice,
        marketAddress,
        200
      );
      await placeBet(market, marketAddress, signers.alice, 0, true, 100);

      let balance = await getUserBalance(
        wrapper,
        wrapperAddress,
        signers.alice
      );
      expect(balance).to.eq(BigInt(cMishaUnits(100)));

      await market.resolveMarket(0, 3);

      await (await market.connect(signers.alice).claimPayout(0)).wait();

      balance = await getUserBalance(wrapper, wrapperAddress, signers.alice);
      expect(balance).to.eq(BigInt(cMishaUnits(200)));
    });
  });

  describe("claimPayout — pool-based", () => {
    it("should pay winners proportionally from pool", async () => {
      await market.createMarket(
        "Pool math test",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );

      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.alice,
        marketAddress,
        200
      );
      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.bob,
        marketAddress,
        200
      );
      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.charlie,
        marketAddress,
        200
      );

      // Alice 70 YES, Bob 30 YES, Charlie 100 NO (in whole cMISHA units)
      await placeBet(market, marketAddress, signers.alice, 0, true, 70);
      await placeBet(market, marketAddress, signers.bob, 0, true, 30);
      await placeBet(market, marketAddress, signers.charlie, 0, false, 100);

      const m = await market.getMarket(0);
      expect(m.betCount).to.eq(3);

      await market.resolveMarket(0, 1); // YES wins
      await verifyAndSubmitTotals(market, 0);

      // Alice: 70 * 200 / 100 = 140, balance = 200 - 70 + 140 = 270
      await (await market.connect(signers.alice).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.alice)
      ).to.eq(BigInt(cMishaUnits(270)));

      // Bob: 30 * 200 / 100 = 60, balance = 200 - 30 + 60 = 230
      await (await market.connect(signers.bob).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.bob)
      ).to.eq(BigInt(cMishaUnits(230)));

      // Charlie: lost, balance = 200 - 100 + 0 = 100
      await (await market.connect(signers.charlie).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.charlie)
      ).to.eq(BigInt(cMishaUnits(100)));
    });

    it("should reject double claim", async () => {
      await market.createMarket(
        "Double claim test",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );
      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.alice,
        marketAddress,
        100
      );
      await placeBet(market, marketAddress, signers.alice, 0, true, 50);
      await market.resolveMarket(0, 1);
      await verifyAndSubmitTotals(market, 0);

      await (await market.connect(signers.alice).claimPayout(0)).wait();
      await expect(
        market.connect(signers.alice).claimPayout(0)
      ).to.be.revertedWithCustomError(market, "AlreadyClaimed");
    });

    it("should reject claim before totals are set", async () => {
      await market.createMarket(
        "No totals test",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );
      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.alice,
        marketAddress,
        100
      );
      await placeBet(market, marketAddress, signers.alice, 0, true, 50);
      await market.resolveMarket(0, 1);

      await expect(
        market.connect(signers.alice).claimPayout(0)
      ).to.be.revertedWithCustomError(market, "TotalsNotDecrypted");
    });
  });

  describe("submitVerifiedTotals — KMS proof verification", () => {
    it("should accept valid KMS proof and enable payouts", async () => {
      await market.createMarket(
        "Verified totals test",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );

      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.alice,
        marketAddress,
        200
      );
      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.bob,
        marketAddress,
        200
      );

      // Alice 100 YES, Bob 100 NO
      await placeBet(market, marketAddress, signers.alice, 0, true, 100);
      await placeBet(market, marketAddress, signers.bob, 0, false, 100);

      // Resolve → triggers makePubliclyDecryptable
      await market.resolveMarket(0, 1); // YES wins

      // Get handles from contract
      const [yesHandle, noHandle] = await market.getMarketHandles(0);

      // Use hardhat plugin's publicDecrypt to get proof
      const results = await fhevm.publicDecrypt([yesHandle, noHandle]);

      // Anyone can submit verified totals (no onlyAdmin needed)
      await (
        await market
          .connect(signers.alice) // non-admin submits!
          .submitVerifiedTotals(
            0,
            results.abiEncodedClearValues,
            results.decryptionProof
          )
      ).wait();

      const m = await market.getMarket(0);
      expect(m.totalsDecrypted).to.be.true;
      // Totals are in 6-decimal cMISHA units
      expect(m.decryptedYesTotal).to.eq(cMishaUnits(100));
      expect(m.decryptedNoTotal).to.eq(cMishaUnits(100));

      // Alice wins: 100 * 200 / 100 = 200, balance = 200 - 100 + 200 = 300
      await (await market.connect(signers.alice).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.alice)
      ).to.eq(BigInt(cMishaUnits(300)));

      // Bob lost: balance = 200 - 100 + 0 = 100
      await (await market.connect(signers.bob).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.bob)
      ).to.eq(BigInt(cMishaUnits(100)));
    });

    it("should reject duplicate submission", async () => {
      await market.createMarket(
        "Duplicate verified test",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );
      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.alice,
        marketAddress,
        100
      );
      await placeBet(market, marketAddress, signers.alice, 0, true, 50);
      await market.resolveMarket(0, 1);

      // First submission
      await verifyAndSubmitTotals(market, 0);

      // Second submission should fail
      const [yesHandle, noHandle] = await market.getMarketHandles(0);
      const results = await fhevm.publicDecrypt([yesHandle, noHandle]);
      await expect(
        market.submitVerifiedTotals(
          0,
          results.abiEncodedClearValues,
          results.decryptionProof
        )
      ).to.be.revertedWithCustomError(market, "TotalsAlreadyDecrypted");
    });

    it("should reject on unresolved market", async () => {
      await market.createMarket(
        "Not resolved test",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );

      await expect(
        market.submitVerifiedTotals(0, "0x", "0x")
      ).to.be.revertedWithCustomError(market, "MarketNotResolved");
    });
  });

  describe("end-to-end with unwrap", () => {
    it("mint → wrap → bet → resolve → claim → check cMISHA balance", async () => {
      await market.createMarket(
        "E2E test",
        "",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );

      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.alice,
        marketAddress,
        500
      );
      await mintWrapAndApprove(
        token,
        wrapper,
        wrapperAddress,
        signers.bob,
        marketAddress,
        500
      );

      // Alice 200 YES, Bob 200 NO
      await placeBet(market, marketAddress, signers.alice, 0, true, 200);
      await placeBet(market, marketAddress, signers.bob, 0, false, 200);

      await market.resolveMarket(0, 1);
      await verifyAndSubmitTotals(market, 0);

      // Alice claims: 200 * 400 / 200 = 400, cMISHA = 500 - 200 + 400 = 700
      await (await market.connect(signers.alice).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.alice)
      ).to.eq(BigInt(cMishaUnits(700)));

      // Bob claims: lost, cMISHA = 500 - 200 + 0 = 300
      await (await market.connect(signers.bob).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.bob)
      ).to.eq(BigInt(cMishaUnits(300)));

      // Note: unwrap is now two-step (unwrap → publicDecrypt → finalizeUnwrap)
      // and requires off-chain KMS interaction, tested in e2e-sepolia.ts
    });
  });
});
