import { KmsEthersSigner } from "aws-kms-ethers-signer";
import { BigNumber, ethers, providers } from "ethers";
import accountAbi from "../../artifacts/contracts/MultisigAccount.sol/MultisigAccount.json";
import factoryAbi from "../../artifacts/contracts/MultisigAccountFactory.sol/MultisigAccountFactory.json";
import nftAbi from "../../artifacts/contracts/SimpleNft.sol/SimpleNft.json";
import { createKmsKey } from "./awsApi";

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

async function initKmsSigner(userId: string) {
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

async function existsAddress(
  provider: ethers.providers.Provider,
  address: string
): Promise<boolean> {
  const code = await provider?.getCode(address);
  return !!!code && code !== "0x";
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
      salt
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

  return await contract.safeMint(toAddress, tokenUri);
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
    return tokenUri;
  });

  return Promise.all(collections);
}
