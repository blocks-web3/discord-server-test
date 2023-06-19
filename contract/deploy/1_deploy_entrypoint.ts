import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getEtherBalance } from "../src/Util";

const deployEntryPoint: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const provider = ethers.provider;
  const servicerAddress = await provider.getSigner().getAddress();
  console.log(
    "==servicerAccount, ETH balance=",
    servicerAddress,
    ",",
    await getEtherBalance(servicerAddress)
  );

  const ep = await hre.deployments.deploy("EntryPoint", {
    from: servicerAddress,
    args: [],
    gasLimit: 7e6,
    deterministicDeployment: true,
  });
  console.log("==ep, addr=", ep.address);
};

export default deployEntryPoint;
