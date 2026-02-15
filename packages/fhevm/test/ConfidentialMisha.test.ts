import type { ConfidentialMisha, MishaToken } from "../types";
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
  const encBalance = await wrapper.connect(user).balanceOf(user.address);
  if (encBalance === ethers.ZeroHash) return 0n;
  return fhevm.userDecryptEuint(
    FhevmType.euint64,
    encBalance,
    wrapperAddress,
    user
  );
}

describe("ConfidentialMisha (Wrapper)", () => {
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

  describe("wrap", () => {
    it("should lock MISHA and mint encrypted cMISHA", async () => {
      // Mint 1000 MISHA (wei) to alice
      await token.mint(signers.alice.address, e(1000));
      // Alice approves wrapper for 1000 MISHA (wei)
      await token.connect(signers.alice).approve(wrapperAddress, e(1000));
      // Alice wraps 500 whole tokens
      await wrapper.connect(signers.alice).wrap(500);

      // Standard MISHA balance should decrease by 500 tokens worth of wei
      expect(await token.balanceOf(signers.alice.address)).to.eq(e(500));
      // Wrapper should hold 500 tokens worth of wei
      expect(await token.balanceOf(wrapperAddress)).to.eq(e(500));

      // Encrypted cMISHA balance = 500 (whole tokens)
      const encBalance = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.alice
      );
      expect(encBalance).to.eq(500n);
    });

    it("should reject wrap of zero amount", async () => {
      await expect(
        wrapper.connect(signers.alice).wrap(0)
      ).to.be.revertedWithCustomError(wrapper, "ZeroAmount");
    });
  });

  describe("unwrap", () => {
    beforeEach(async () => {
      await token.mint(signers.alice.address, e(1000));
      await token.connect(signers.alice).approve(wrapperAddress, e(1000));
      await wrapper.connect(signers.alice).wrap(500);
    });

    it("should burn cMISHA and release MISHA", async () => {
      await wrapper.connect(signers.alice).unwrap(200);

      // Standard balance: e(500) + e(200) = e(700)
      expect(await token.balanceOf(signers.alice.address)).to.eq(e(700));
      // Wrapper holds: e(500) - e(200) = e(300)
      expect(await token.balanceOf(wrapperAddress)).to.eq(e(300));

      // Encrypted balance: 500 - 200 = 300
      const encBalance = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.alice
      );
      expect(encBalance).to.eq(300n);
    });

    it("should reject unwrap of zero amount", async () => {
      await expect(
        wrapper.connect(signers.alice).unwrap(0)
      ).to.be.revertedWithCustomError(wrapper, "ZeroAmount");
    });
  });

  describe("full roundtrip", () => {
    it("mint MISHA → wrap → encrypted transfer → unwrap → verify MISHA", async () => {
      // Mint 1000 MISHA to alice
      await token.mint(signers.alice.address, e(1000));
      await token.connect(signers.alice).approve(wrapperAddress, e(1000));

      // Alice wraps 600
      await wrapper.connect(signers.alice).wrap(600);

      // Alice transfers 200 encrypted cMISHA to bob
      const input = fhevm.createEncryptedInput(
        wrapperAddress,
        signers.alice.address
      );
      input.add64(200);
      const encrypted = await input.encrypt();

      await (
        await wrapper
          .connect(signers.alice)
          .transfer(
            signers.bob.address,
            encrypted.handles[0],
            encrypted.inputProof
          )
      ).wait();

      // Alice encrypted balance: 600 - 200 = 400
      const aliceEnc = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.alice
      );
      expect(aliceEnc).to.eq(400n);

      // Bob encrypted balance: 200
      const bobEnc = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.bob
      );
      expect(bobEnc).to.eq(200n);

      // Bob unwraps 200 → gets 200 MISHA (wei)
      await wrapper.connect(signers.bob).unwrap(200);
      expect(await token.balanceOf(signers.bob.address)).to.eq(e(200));

      // Alice unwraps remaining 400
      await wrapper.connect(signers.alice).unwrap(400);
      // Alice: e(400) not wrapped + e(400) unwrapped = e(800)
      expect(await token.balanceOf(signers.alice.address)).to.eq(e(800));
    });
  });

  describe("encrypted transfer", () => {
    beforeEach(async () => {
      await token.mint(signers.alice.address, e(1000));
      await token.connect(signers.alice).approve(wrapperAddress, e(1000));
      await wrapper.connect(signers.alice).wrap(1000);
    });

    it("should transfer encrypted amount between users", async () => {
      const input = fhevm.createEncryptedInput(
        wrapperAddress,
        signers.alice.address
      );
      input.add64(300);
      const encrypted = await input.encrypt();

      await (
        await wrapper
          .connect(signers.alice)
          .transfer(
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
      expect(aliceBalance).to.eq(700n);

      const bobBalance = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.bob
      );
      expect(bobBalance).to.eq(300n);
    });
  });

  describe("approve + transferFrom (encrypted)", () => {
    beforeEach(async () => {
      await token.mint(signers.alice.address, e(1000));
      await token.connect(signers.alice).approve(wrapperAddress, e(1000));
      await wrapper.connect(signers.alice).wrap(1000);
    });

    it("should approve and transferFrom with encrypted amounts", async () => {
      const approveInput = fhevm.createEncryptedInput(
        wrapperAddress,
        signers.alice.address
      );
      approveInput.add64(200);
      const approveEncrypted = await approveInput.encrypt();

      await (
        await wrapper
          .connect(signers.alice)
          .approve(
            signers.bob.address,
            approveEncrypted.handles[0],
            approveEncrypted.inputProof
          )
      ).wait();

      const transferInput = fhevm.createEncryptedInput(
        wrapperAddress,
        signers.bob.address
      );
      transferInput.add64(150);
      const transferEncrypted = await transferInput.encrypt();

      await (
        await wrapper
          .connect(signers.bob)
          .transferFrom(
            signers.alice.address,
            signers.bob.address,
            transferEncrypted.handles[0],
            transferEncrypted.inputProof
          )
      ).wait();

      const aliceBalance = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.alice
      );
      expect(aliceBalance).to.eq(850n);

      const bobBalance = await getEncryptedBalance(
        wrapper,
        wrapperAddress,
        signers.bob
      );
      expect(bobBalance).to.eq(150n);
    });
  });
});
