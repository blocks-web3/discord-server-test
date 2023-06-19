import { KmsEthersSigner } from "aws-kms-ethers-signer";
import { Contract, ethers, providers } from "ethers";
import accountAbi from "../artifacts/contracts/MultisigAccount.sol/MultisigAccount.json";
import factoryAbi from "../artifacts/contracts/MultisigAccountFactory.sol/MultisigAccountFactory.json";
import nftAbi from "../artifacts/contracts/SimpleNft.sol/SimpleNft.json";
import epAbi from "../artifacts/contracts/core/EntryPoint.sol/EntryPoint.json";
import { UserOperation } from "./UserOperation";
import { createKmsKey } from "./awsApi";

type TokenMetadata = {
  name: string;
  description: string;
  image: string;
  attributes: [Object];
};

function getAlchemyProvider() {
  return new providers.AlchemyProvider(
    "maticmum",
    process.env.ALCHEMY_APIKEY!!
  );
}

function getBundlerSigner() {
  return new ethers.Wallet(
    process.env.BUNDLER_PRIVATE_KEY!!,
    getAlchemyProvider()
  );
}

export async function initKmsSigner(userId: string) {
  const keyMetaData = await createKmsKey(userId);
  if (!keyMetaData?.KeyId) {
    throw Error("not found kms key id.");
  }
  return new KmsEthersSigner(
    { keyId: keyMetaData.KeyId },
    getAlchemyProvider()
  );
}

function getAccountFactory(
  signerOrProvider: ethers.providers.Provider | ethers.Signer
) {
  return new ethers.Contract(
    process.env.ACCOUNT_FACTORY_ADDR!!,
    factoryAbi.abi,
    signerOrProvider
  );
}

function getEntryPoint(
  signerOrProvider: ethers.providers.Provider | ethers.Signer
) {
  return new ethers.Contract(
    process.env.ENTRYPOINT_ADDR!!,
    epAbi.abi,
    signerOrProvider
  );
}

async function existsAddress(
  provider: ethers.providers.Provider,
  address: string
): Promise<boolean> {
  const code = await provider?.getCode(address);
  return !!code && code !== "0x";
}

export async function getAccount(
  discordUserId: string,
  salt: number = 0
): Promise<{
  kmsSigner: ethers.Signer;
  walletContract: ethers.Contract;
  isExist: boolean;
}> {
  const bundlerSigner = getBundlerSigner();
  const kmsSigner = await initKmsSigner(discordUserId);
  console.log("kms address:", await kmsSigner.getAddress());

  const walletAddress = await getAccountFactory(bundlerSigner).getAddress(
    await kmsSigner.getAddress(),
    salt
  );
  const walletContract = new ethers.Contract(
    walletAddress,
    accountAbi.abi,
    bundlerSigner
  );
  const isExist = await existsAddress(bundlerSigner.provider, walletAddress);
  if (!isExist) {
    console.warn("account is not exist.", walletContract.address);
  }
  return { kmsSigner, walletContract, isExist };
}

export async function mintNft(toAddress: string, tokenUri: string) {
  const address = process.env.NFT_CONTRACT_ADDR;
  if (!address) {
    throw Error("not found nft contract address.");
  }
  console.log(toAddress);

  const contract = new ethers.Contract(address, nftAbi.abi, getBundlerSigner());

  return await contract.safeMint(toAddress, tokenUri, { gasLimit: 3000000 });
}

export function sendErc721Operation(
  erc721Contract: Contract,
  fromAddr: string,
  toAddr: string,
  tokenId: number
): UserOperation {
  const accountIf = new ethers.utils.Interface(accountAbi.abi);
  const erc721If = new ethers.utils.Interface(nftAbi.abi);

  // const callData = accountIf.encodeFunctionData(
  //   "execute(address to, uint256 value, bytes data)",
  //   [
  //     erc721Contract.address,
  //     ethers.constants.Zero,
  //     erc721If.encodeFunctionData(
  //       "safeTransferFrom(address, address, uint256)",
  //       [fromAddr, toAddr, tokenId]
  //     ),
  //   ]
  // );

  const callData = accountIf.encodeFunctionData(
    "execute(address to, uint256 value, bytes data)",
    [
      erc721Contract.address,
      ethers.constants.Zero,
      erc721If.encodeFunctionData(
        "safeTransferFrom(address, address, uint256)",
        [fromAddr, toAddr, tokenId]
      ),
    ]
  );

  return {
    sender: fromAddr,
    nonce: 0,
    initCode: "0x",
    callData: callData,
    callGasLimit: 40000,
    verificationGasLimit: 150000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
    preVerificationGas: 2100000, // should also cover calldata cost.
    maxFeePerGas: 1,
    maxPriorityFeePerGas: 1e9,
    paymasterAndData: "0x",
    signature: "0x", // あとで設定する
  };
}
