import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploySimpleAccountFactory: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const signer = ethers.provider.getSigner();
  const signerAddress = await signer.getAddress();

  const ret = await hre.deployments.deploy("SimpleNft", {
    from: signerAddress,
    nonce: (await signer.getTransactionCount()) + 1, // おそらくバグ。NanceTooLowでデプロイのTXが失敗するのでその回避のため
  });
  console.log("==Nft addr=", ret.address);
};

export default deploySimpleAccountFactory;
