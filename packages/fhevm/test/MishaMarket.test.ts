import type { ConfidentialMisha, MishaMarket, MishaToken } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

/// Convert whole tokens to wei (18 decimals)
const e = (n: number) => ethers.parseEther(n.toString());

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

/// Mint MISHA (wei) → approve wrapper (wei) → wrap (whole tokens) → approve market (encrypted cMISHA)
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

  // Wrap whole tokens → locks wei, mints encrypted cMISHA
  await (await wrapper.connect(user).wrap(amount)).wait();

  // Approve market contract for encrypted cMISHA (whole tokens)
  const input = fhevm.createEncryptedInput(wrapperAddress, user.address);
  input.add64(amount);
  const encrypted = await input.encrypt();

  await (
    await wrapper
      .connect(user)
      .approve(marketAddress, encrypted.handles[0], encrypted.inputProof)
  ).wait();
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
  input.add64(amount);
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
  const encBalance = await wrapper.connect(user).balanceOf(user.address);
  if (encBalance === ethers.ZeroHash) return 0n;
  return fhevm.userDecryptEuint(
    FhevmType.euint64,
    encBalance,
    wrapperAddress,
    user
  );
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
          .createMarket("test", futureTimestamp(3600), futureTimestamp(7200))
      ).to.be.revertedWithCustomError(market, "OnlyAdmin");
    });

    it("should increment marketCount", async () => {
      await market.createMarket(
        "Market 1",
        futureTimestamp(3600),
        futureTimestamp(7200)
      );
      await market.createMarket(
        "Market 2",
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
      expect(balance).to.eq(400n); // 500 - 100
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
      expect(balance).to.eq(100n);

      await market.resolveMarket(0, 3);

      await (await market.connect(signers.alice).claimPayout(0)).wait();

      balance = await getUserBalance(wrapper, wrapperAddress, signers.alice);
      expect(balance).to.eq(200n);
    });
  });

  describe("claimPayout — pool-based", () => {
    it("should pay winners proportionally from pool", async () => {
      await market.createMarket(
        "Pool math test",
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

      // Alice 70 YES, Bob 30 YES, Charlie 100 NO
      await placeBet(market, marketAddress, signers.alice, 0, true, 70);
      await placeBet(market, marketAddress, signers.bob, 0, true, 30);
      await placeBet(market, marketAddress, signers.charlie, 0, false, 100);

      const m = await market.getMarket(0);
      expect(m.betCount).to.eq(3);

      await market.resolveMarket(0, 1); // YES wins
      await market.setDecryptedTotals(0, 100, 100);

      // Alice: 70 * 200 / 100 = 140, balance = 200 - 70 + 140 = 270
      await (await market.connect(signers.alice).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.alice)
      ).to.eq(270n);

      // Bob: 30 * 200 / 100 = 60, balance = 200 - 30 + 60 = 230
      await (await market.connect(signers.bob).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.bob)
      ).to.eq(230n);

      // Charlie: lost, balance = 200 - 100 + 0 = 100
      await (await market.connect(signers.charlie).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.charlie)
      ).to.eq(100n);
    });

    it("should reject double claim", async () => {
      await market.createMarket(
        "Double claim test",
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
      await market.setDecryptedTotals(0, 50, 0);

      await (await market.connect(signers.alice).claimPayout(0)).wait();
      await expect(
        market.connect(signers.alice).claimPayout(0)
      ).to.be.revertedWithCustomError(market, "AlreadyClaimed");
    });

    it("should reject claim before totals are set", async () => {
      await market.createMarket(
        "No totals test",
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

  describe("end-to-end with unwrap", () => {
    it("mint → wrap → bet → resolve → claim → unwrap → check MISHA", async () => {
      await market.createMarket(
        "E2E test",
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
      await market.setDecryptedTotals(0, 200, 200);

      // Alice claims: 200 * 400 / 200 = 400, cMISHA = 500 - 200 + 400 = 700
      await (await market.connect(signers.alice).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.alice)
      ).to.eq(700n);

      // Alice unwraps all 700 → 700 MISHA (in wei)
      await wrapper.connect(signers.alice).unwrap(700);
      expect(await token.balanceOf(signers.alice.address)).to.eq(e(700));

      // Bob claims: lost, cMISHA = 500 - 200 + 0 = 300
      await (await market.connect(signers.bob).claimPayout(0)).wait();
      expect(
        await getUserBalance(wrapper, wrapperAddress, signers.bob)
      ).to.eq(300n);

      // Bob unwraps 300 → 300 MISHA (in wei)
      await wrapper.connect(signers.bob).unwrap(300);
      expect(await token.balanceOf(signers.bob.address)).to.eq(e(300));
    });
  });
});
