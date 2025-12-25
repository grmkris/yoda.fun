// biome-ignore lint/performance/noBarrelFile: package entry point
export { ERC20_ABI, USDC_ADDRESSES } from "./constants";
export {
  createUsdcClient,
  type UsdcClient,
  type UsdcClientConfig,
} from "./usdc-client";
