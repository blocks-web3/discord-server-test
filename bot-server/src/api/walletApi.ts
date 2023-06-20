import { KmsEthersSigner } from "aws-kms-ethers-signer";
import { BigNumber, Contract, Signer, ethers, providers } from "ethers";
import accountAbi from "../../../contract/artifacts/contracts/SimpleAccount.sol/SimpleAccount.json";
import factoryAbi from "../../../contract/artifacts/contracts/SimpleAccountFactory.sol/SimpleAccountFactory.json";
import nftAbi from "../../../contract/artifacts/contracts/SimpleNft.sol/SimpleNft.json";
import pmAbi from "../../../contract/artifacts/contracts/VerifyingPaymaster.sol/VerifyingPaymaster.json";
import epAbi from "../../../contract/artifacts/contracts/core/EntryPoint.sol/EntryPoint.json";
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

function getPayMaster(
  signerOrProvider: ethers.providers.Provider | ethers.Signer
) {
  return new ethers.Contract(
    process.env.PAY_MASTER_ADDR!!,
    pmAbi.abi,
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
  salt: number = 1
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
  salt: number = 1
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
  const pm = getPayMaster(bundlerSigner);
  const result = await pm.deposit({ value: ethers.utils.parseEther("2") });
  console.log(`==deposit=`, result);

  const userOp = sendErc721Operation(
    erc721Contract,
    userAccount.walletContract.address,
    toAddress,
    tokenId
  );
  userOp.paymasterAndData = await getPaymasterAndData(
    userOp,
    getPayMaster(bundlerSigner),
    bundlerSigner
  );

  const opHash = getUserOpHash(userOp, ep, network.chainId);
  console.log("opHash", opHash);

  const sig = await userAccount.kmsSigner.signMessage(
    ethers.utils.arrayify(opHash)
  );
  userOp.signature = "0x" + sig;
  console.log("userOp", userOp);
  const bundlerAddress = await bundlerSigner.getAddress();

  const op = await ep.handleOps([userOp], bundlerAddress, {
    gasLimit: 2000000,
  });
  try {
    await op.wait();
  } catch (e: any) {
    console.log(e.message);
  }

  return op;

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

  const tokenIds = [...Array(count.toNumber())].map(async (item, index) => {
    const tokenId: BigNumber = await contract.tokenOfOwnerByIndex(
      ownerAddress,
      index
    );
    return tokenId.toNumber();
  });

  return Promise.all(tokenIds);
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
    nonce: 0,
    initCode: "0x",
    callData: callData,
    callGasLimit: 400000,
    verificationGasLimit: 400000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
    preVerificationGas: 2100000, // should also cover calldata cost.
    maxFeePerGas: 1,
    maxPriorityFeePerGas: 1e9,
    paymasterAndData: "0x",
    signature: "0x", // あとで設定する
  };
}

async function getPaymasterAndData(
  userOp: UserOperation,
  paymaster: Contract,
  signer: Signer
) {
  const MOCK_VALID_UNTIL = "0x00000000deadbeef";
  const MOCK_VALID_AFTER = "0x0000000000001234";
  userOp.paymasterAndData = ethers.utils.hexConcat([
    paymaster.address,
    ethers.utils.defaultAbiCoder.encode(
      ["uint48", "uint48"],
      [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]
    ),
    "0x" + "00".repeat(65),
  ]);
  const hash = await paymaster.getHash(
    userOp,
    MOCK_VALID_UNTIL,
    MOCK_VALID_AFTER
  );
  const sig = await signer.signMessage(ethers.utils.arrayify(hash));
  return ethers.utils.hexConcat([
    paymaster.address,
    ethers.utils.defaultAbiCoder.encode(
      ["uint48", "uint48"],
      [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]
    ),
    sig,
  ]);
}
