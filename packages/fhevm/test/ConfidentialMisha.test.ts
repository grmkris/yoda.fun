import type { ConfidentialMisha, MishaToken } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

/// Convert whole tokens to wei (18 decimals)
const e = (n: number) => ethers.parseEther(n.toString());

/// cMISHA has 6 decimals, rate = 1e12
const CMISHA_DECIMALS = 6;
const cMishaUnits = (n: number) => n * 10 ** CMISHA_DECIMALS;

/// ERC-7984 max uint48 for operator approval
const MAX_UINT48 = 281474976710655;

interface Signers {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
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

  return { token, tokenAddress, wrapper, wrapperAddress };
}

async function getEncryptedBalance(
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

describe("ConfidentialMisha (ERC-7984 Wrapper)", () => {
  let signers: Signers;
  let token: MishaToken;
  let wrapper: ConfidentialMisha;
  let wrapperAddress: string;

  before(async () => {
    const ethSigners = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
  });

  beforeEach(async () => {
    ({ token, wrapper, wrapperAddress } = await deployFixture());
  });

  describe("metadata", () => {
    it("should have correct name, symbol, decimals", async () => {
      expect(await wrapper.name()).to.eq("Confidential Misha");
      expect(await wrapper.symbol()).to.eq("cMISHA");
      expect(await wrapper.decimals()).to.eq(6);
    });

    it("should have rate = 1e12", async () => {
      expect(await wrapper.rate()).to.eq(BigInt(1e12));
    });

    it("should point to underlying MishaToken", async () => {
      const tokenAddress = await token.getAddress();
      expect(await wrapper.underlying()).to.eq(tokenAddress);
    });
  });

  describe("wrap", () => {
    it("should lock MISHA and mint encrypted cMISHA", async () => {
      // Mint 1000 MISHA (wei) to alice
      await token.mint(signers.alice.address, e(1000));
      // Alice approves wrapper for 1000 MISHA (wei)
      await token.connect(signers.alice).approve(wrapperAddress, e(1000));
      // Alice wraps 500 MISHA — wrap(to, weiAmount)
      await wrapper.connect(signers.alice).wrap(signers.alice.address, e(500));

      // Standard MISHA balance should decrease by 500 tokens worth of wei
      expect(await token.balanceOf(signers.alice.address)).to.eq(e(500));
      // Wrapper should hold 500 tokens worth of wei
      expect(await token.balanceOf(wrapperAddress)).to.eq(e(500));

      // Encrypted cMISHA balance = 500_000000 (6-decimal units)
      const encBalance = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.alice
      );
      expect(encBalance).to.eq(BigInt(cMishaUnits(500)));
    });
  });

  describe("confidentialTransfer", () => {
    beforeEach(async () => {
      await token.mint(signers.alice.address, e(1000));
      await token.connect(signers.alice).approve(wrapperAddress, e(1000));
      await wrapper.connect(signers.alice).wrap(signers.alice.address, e(1000));
    });

    it("should transfer encrypted amount between users", async () => {
      const input = fhevm.createEncryptedInput(
        wrapperAddress,
        signers.alice.address
      );
      input.add64(cMishaUnits(300));
      const encrypted = await input.encrypt();

      await (
        await wrapper
          .connect(signers.alice)
          ["confidentialTransfer(address,bytes32,bytes)"](
            signers.bob.address,
            encrypted.handles[0],
            encrypted.inputProof
          )
      ).wait();

      const aliceBalance = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.alice
      );
      expect(aliceBalance).to.eq(BigInt(cMishaUnits(700)));

      const bobBalance = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.bob
      );
      expect(bobBalance).to.eq(BigInt(cMishaUnits(300)));
    });
  });

  describe("operator + confidentialTransferFrom", () => {
    beforeEach(async () => {
      await token.mint(signers.alice.address, e(1000));
      await token.connect(signers.alice).approve(wrapperAddress, e(1000));
      await wrapper.connect(signers.alice).wrap(signers.alice.address, e(1000));
    });

    it("should allow operator to transfer on behalf of holder", async () => {
      // Alice sets bob as operator
      await wrapper.connect(signers.alice).setOperator(signers.bob.address, MAX_UINT48);

      expect(
        await wrapper.isOperator(signers.alice.address, signers.bob.address)
      ).to.be.true;

      // Bob creates encrypted input for confidentialTransferFrom
      const input = fhevm.createEncryptedInput(
        wrapperAddress,
        signers.bob.address
      );
      input.add64(cMishaUnits(200));
      const encrypted = await input.encrypt();

      await (
        await wrapper
          .connect(signers.bob)
          ["confidentialTransferFrom(address,address,bytes32,bytes)"](
            signers.alice.address,
            signers.bob.address,
            encrypted.handles[0],
            encrypted.inputProof
          )
      ).wait();

      const aliceBalance = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.alice
      );
      expect(aliceBalance).to.eq(BigInt(cMishaUnits(800)));

      const bobBalance = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.bob
      );
      expect(bobBalance).to.eq(BigInt(cMishaUnits(200)));
    });

    it("should reject transferFrom without operator approval", async () => {
      const input = fhevm.createEncryptedInput(
        wrapperAddress,
        signers.bob.address
      );
      input.add64(cMishaUnits(100));
      const encrypted = await input.encrypt();

      await expect(
        wrapper
          .connect(signers.bob)
          ["confidentialTransferFrom(address,address,bytes32,bytes)"](
            signers.alice.address,
            signers.bob.address,
            encrypted.handles[0],
            encrypted.inputProof
          )
      ).to.be.reverted;
    });
  });
});
