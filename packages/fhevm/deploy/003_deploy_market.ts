import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async ({ deployments, getNamedAccounts }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const wrapper = await deployments.get("ConfidentialMisha");

  const market = await deploy("MishaMarket", {
    from: deployer,
    args: [wrapper.address],
    log: true,
  });

  console.log(`MishaMarket deployed at: ${market.address}`);
  console.log(`  → using ConfidentialMisha at: ${wrapper.address}`);
};

func.tags = ["MishaMarket"];
func.dependencies = ["ConfidentialMisha"];
export default func;
