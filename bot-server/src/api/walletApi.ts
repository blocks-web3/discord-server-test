import { KmsEthersSigner } from "aws-kms-ethers-signer";
import axios from "axios";
import { BigNumber, Contract, Signer, ethers, providers } from "ethers";
import accountAbi from "../../artifacts/contracts/MultisigAccount.sol/MultisigAccount.json";
import factoryAbi from "../../artifacts/contracts/MultisigAccountFactory.sol/MultisigAccountFactory.json";
import nftAbi from "../../artifacts/contracts/SimpleNft.sol/SimpleNft.json";
import epAbi from "../../artifacts/contracts/core/EntryPoint.sol/EntryPoint.json";
import { UserOperation, getUserOpHash } from "./UserOperation";
import { createKmsKey } from "./awsApi";

type TokenMetadata = {
  name: string;
  description: string;
  image: string;
  attributes: [Object];
};

function getProvider() {
  return process.env.JSON_RPC_URL ? getJsonRpcProvider() : getAlchemyProvider();
}

function getAlchemyProvider() {
  return new providers.AlchemyProvider(
    "maticmum",
    process.env.ALCHEMY_APIKEY!!
  );
}

function getJsonRpcProvider() {
  return new providers.JsonRpcProvider(process.env.JSON_RPC_URL!!);
}

function getBundlerSigner() {
  return new ethers.Wallet(process.env.BUNDLER_PRIVATE_KEY!!, getProvider());
}

async function initKmsSigner(userId: string) {
  const keyMetaData = await createKmsKey(userId);
  if (!keyMetaData?.KeyId) {
    throw Error("not found kms key id.");
  }
  return new KmsEthersSigner({ keyId: keyMetaData.KeyId }, getProvider());
}

function getAccountFactory(
  signerOrProvider: ethers.providers.Provider | ethers.Signer
): Contract {
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

export async function getOrCreateAccount(
  discordUserId: string,
  salt: number = 0
) {
  const bundlerSigner = getBundlerSigner();

  const account = await getAccount(discordUserId);

  if (!account.isExist) {
    const res = await getAccountFactory(bundlerSigner).createAccount(
      await account.kmsSigner.getAddress(),
      salt,
      { gasLimit: 300000 }
    );
    console.log("==account created!! tx=", res.hash);
  }
  return account;
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

export async function sendNft(
  fromUserId: string,
  toAddress: string,
  tokenId: number
) {
  const userAccount = await getOrCreateAccount(fromUserId);
  return await sendErc721(userAccount, toAddress, tokenId);
}
export async function sendErc721(
  userAccount: {
    kmsSigner: Signer;
    walletContract: Contract;
    isExist: boolean;
  },
  toAddress: string,
  tokenId: number
) {
  const address = process.env.NFT_CONTRACT_ADDR;
  if (!address) {
    throw Error("not found nft contract address.");
  }
  const bundlerSigner = getBundlerSigner();
  const network = await bundlerSigner.provider.getNetwork();

  const erc721Contract = new ethers.Contract(
    address,
    nftAbi.abi,
    getBundlerSigner()
  );
  const ep = getEntryPoint(bundlerSigner);

  const userOp = sendErc721Operation(
    erc721Contract,
    userAccount.walletContract.address,
    toAddress,
    tokenId
  );
  const opHash = getUserOpHash(userOp, ep, network.chainId);
  console.log("opHash", opHash);
  // userOp.signature = "0x" + (await userAccount.kmsSigner.signMessage(opHash));
  const sig = await userAccount.kmsSigner.signMessage(
    ethers.utils.arrayify(opHash)
  );
  userOp.signature = "0x" + sig;
  console.log("userOp", userOp);
  const bundlerAddress = await bundlerSigner.getAddress();
  return await ep.handleOps([userOp], bundlerAddress, { gasLimit: 2000000 });

  // return await erc721Contract.safeTransferFrom(
  //   toAddress,
  //   getBundlerSigner().address,
  //   tokenId,
  //   { gasLimit: 3000000 }
  // );
}

export async function getCollection(ownerAddress: string) {
  const address = process.env.NFT_CONTRACT_ADDR;
  if (!address) {
    throw Error("not found nft contract address.");
  }
  const contract = new ethers.Contract(address, nftAbi.abi, getBundlerSigner());

  const count: BigNumber = await contract.balanceOf(ownerAddress);
  if (count.toNumber() < 1) {
    return [];
  }

  const collections = [...Array(count.toNumber())].map(async (item, index) => {
    const tokenId: BigNumber = await contract.tokenOfOwnerByIndex(
      ownerAddress,
      index
    );
    const tokenUri = await contract.tokenURI(tokenId.toString());
    console.log("tokenId", tokenId, " tokenUri", tokenUri);
    const tokenMetadata = await axios.get(tokenUri);

    return { metadata: tokenMetadata.data as TokenMetadata, tokenUri, tokenId };
  });

  return Promise.all(collections);
}

function sendErc721Operation(
  erc721Contract: Contract,
  fromAddr: string,
  toAddr: string,
  tokenId: number
): UserOperation {
  const accountIf = new ethers.utils.Interface(accountAbi.abi);
  const erc721If = new ethers.utils.Interface(nftAbi.abi);

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
    nonce: 1,
    initCode: "0x",
    callData: callData,
    callGasLimit: 400000,
    verificationGasLimit: 150000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
    preVerificationGas: 2100000, // should also cover calldata cost.
    maxFeePerGas: 1,
    maxPriorityFeePerGas: 1e9,
    paymasterAndData: "0x",
    signature: "0x", // あとで設定する
  };
}
