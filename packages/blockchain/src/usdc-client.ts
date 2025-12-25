import type { Logger } from "@yoda.fun/logger";
import type { Network } from "@yoda.fun/shared/constants";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { ERC20_ABI, USDC_ADDRESSES } from "./constants";

export interface UsdcClientConfig {
  privateKey: `0x${string}`;
  network: Network;
  logger: Logger;
}

const CHAINS = {
  base,
  "base-sepolia": baseSepolia,
} as const;

const USDC_DECIMALS = 6;

export function createUsdcClient(config: UsdcClientConfig) {
  const { privateKey, network, logger } = config;

  const chain = CHAINS[network];
  const usdcAddress = USDC_ADDRESSES[network];
  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  return {
    async getBalance(): Promise<number> {
      const balance = await publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account.address],
      });
      return Number(formatUnits(balance, USDC_DECIMALS));
    },

    async transfer(to: `0x${string}`, amount: number): Promise<`0x${string}`> {
      const amountWei = parseUnits(amount.toString(), USDC_DECIMALS);

      logger.info({ to, amount }, "Initiating USDC transfer");

      const { request } = await publicClient.simulateContract({
        account,
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to, amountWei],
      });

      const hash = await walletClient.writeContract(request);
      logger.info({ hash, to, amount }, "USDC transfer submitted");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error(`USDC transfer reverted: ${hash}`);
      }

      logger.info(
        { hash, blockNumber: receipt.blockNumber },
        "USDC transfer confirmed"
      );
      return hash;
    },

    getAddress: () => account.address,
  };
}

export type UsdcClient = ReturnType<typeof createUsdcClient>;
