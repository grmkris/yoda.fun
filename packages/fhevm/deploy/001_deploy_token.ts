import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async ({ deployments, getNamedAccounts }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const token = await deploy("MishaToken", {
    from: deployer,
    args: [],
    log: true,
  });

  console.log(`MishaToken (ERC-20) deployed at: ${token.address}`);
};

func.tags = ["MishaToken"];
export default func;
