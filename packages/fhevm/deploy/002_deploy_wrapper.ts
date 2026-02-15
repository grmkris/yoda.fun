import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async ({ deployments, getNamedAccounts }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const token = await deployments.get("MishaToken");

  const wrapper = await deploy("ConfidentialMisha", {
    from: deployer,
    args: [token.address],
    log: true,
  });

  console.log(`ConfidentialMisha (wrapper) deployed at: ${wrapper.address}`);
  console.log(`  → wrapping MishaToken at: ${token.address}`);
};

func.tags = ["ConfidentialMisha"];
func.dependencies = ["MishaToken"];
export default func;
