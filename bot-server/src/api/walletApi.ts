import { KmsEthersSigner } from "aws-kms-ethers-signer";
import { Signer, ethers, providers } from "ethers";
import accountAbi from "../../artifacts/contracts/MultisigAccount.sol/MultisigAccount.json";
import factoryAbi from "../../artifacts/contracts/MultisigAccountFactory.sol/MultisigAccountFactory.json";
import { createKmsKey, getKeyAlias } from "./awsApi";

export async function createAccount(discordUserId: string, salt: number) {
  const bundlerSigner = getBundlerSigner();
  const accountFactory = new ethers.Contract(
    process.env.ACCOUNT_FACTORY_ADDR!!,
    factoryAbi.abi,
    getAlchemyProvider()
  );

  // const wallet = await createWallet(accountFactory, 1, bundlerSigner);

  const kmsSigner = await getKmsSigner(discordUserId);
  console.log("kms address:", await kmsSigner.getAddress());
  const walletAddress = await accountFactory.getAddress(
    await kmsSigner.getAddress(),
    salt
  );
  console.log("account address:", walletAddress);

  // const artifact = await hre.deployments.getArtifact("MultisigAccount");
  const walletContract = new ethers.Contract(
    walletAddress,
    accountAbi.abi,
    bundlerSigner
  );

  if (!(await existsAddress(bundlerSigner, walletAddress))) {
    const res = await accountFactory.createAccount(
      await kmsSigner.getAddress(),
      salt
    );
    console.debug("==account created!! tx=", res.hash);
  }
  return { kmsSigner, walletContract };
}

function getAlchemyProvider() {
  return new providers.AlchemyProvider(
    "maticmum",
    process.env.ALCHEMY_APIKEY!!
  );
}

function getBundlerSigner() {
  const signer = new ethers.Wallet(process.env.BUNDLER_PRIVATE_KEY!!);

  signer.connect(getAlchemyProvider());
  return signer;
}

async function getKmsSigner(userId: string) {
  await createKmsKey(userId);
  const signer = new KmsEthersSigner({ keyId: getKeyAlias(userId) });
  signer.connect(getAlchemyProvider());
  return signer;
}

async function existsAddress(
  bundlerSigner: Signer,
  address: string
): Promise<boolean> {
  const code = await bundlerSigner.provider?.getCode(address);
  return code !== "0x";
}
