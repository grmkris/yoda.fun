import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { MishaToken } from "../types";

const e = (n: number) => ethers.parseEther(n.toString());

interface Signers {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
}

async function deployFixture() {
  const factory = await ethers.getContractFactory("MishaToken");
  const token = (await factory.deploy()) as unknown as MishaToken;
  const tokenAddress = await token.getAddress();
  return { token, tokenAddress };
}

describe("MishaToken (Standard ERC-20)", () => {
  let signers: Signers;
  let token: MishaToken;

  before(async () => {
    const ethSigners = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
  });

  beforeEach(async () => {
    ({ token } = await deployFixture());
  });

  describe("mint", () => {
    it("should mint tokens and update totalSupply", async () => {
      await token.mint(signers.alice.address, e(1000));
      expect(await token.totalSupply()).to.eq(e(1000));
      expect(await token.balanceOf(signers.alice.address)).to.eq(e(1000));
    });

    it("should reject non-admin caller", async () => {
      await expect(
        token.connect(signers.alice).mint(signers.alice.address, e(100))
      ).to.be.revertedWithCustomError(token, "OnlyAdmin");
    });

    it("should reject mint to zero address", async () => {
      await expect(
        token.mint(ethers.ZeroAddress, e(100))
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });
  });

  describe("transfer", () => {
    beforeEach(async () => {
      await token.mint(signers.alice.address, e(1000));
    });

    it("should transfer tokens between users", async () => {
      await token.connect(signers.alice).transfer(signers.bob.address, e(300));

      expect(await token.balanceOf(signers.alice.address)).to.eq(e(700));
      expect(await token.balanceOf(signers.bob.address)).to.eq(e(300));
    });

    it("should revert on insufficient balance", async () => {
      await expect(
        token.connect(signers.alice).transfer(signers.bob.address, e(2000))
      ).to.be.revertedWithCustomError(token, "InsufficientBalance");
    });
  });

  describe("approve + transferFrom", () => {
    beforeEach(async () => {
      await token.mint(signers.alice.address, e(1000));
    });

    it("should approve and transferFrom", async () => {
      await token.connect(signers.alice).approve(signers.bob.address, e(200));
      expect(
        await token.allowance(signers.alice.address, signers.bob.address)
      ).to.eq(e(200));

      await token
        .connect(signers.bob)
        .transferFrom(signers.alice.address, signers.bob.address, e(150));

      expect(await token.balanceOf(signers.alice.address)).to.eq(e(850));
      expect(await token.balanceOf(signers.bob.address)).to.eq(e(150));
      expect(
        await token.allowance(signers.alice.address, signers.bob.address)
      ).to.eq(e(50));
    });

    it("should revert on insufficient allowance", async () => {
      await token.connect(signers.alice).approve(signers.bob.address, e(100));

      await expect(
        token
          .connect(signers.bob)
          .transferFrom(signers.alice.address, signers.bob.address, e(200))
      ).to.be.revertedWithCustomError(token, "InsufficientAllowance");
    });
  });
});
