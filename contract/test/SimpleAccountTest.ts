import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { defaultAbiCoder, hexConcat, keccak256 } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { MultisigWallet, createWallet, getEtherBalance } from "../src/Util";
import {
  UserOperation,
  fillUserOpDefaults,
  getUserOpHash,
} from "./UserOperation";
import { initKmsSigner, sendErc721Operation } from "./walletApi";

describe("SimpleAccount", function () {
  async function deploy() {
    const [bundler] = await ethers.getSigners();
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const ep = await EntryPoint.deploy();
    await ep.deployed();
    console.log("==entrypoint addr=", ep.address);

    const Factory = await ethers.getContractFactory("SimpleAccountFactory");
    const factory = await Factory.deploy(ep.address);
    await factory.deployed();
    console.log("==factory addr=", factory.address);

    const Paymaster = await ethers.getContractFactory("VerifyingPaymaster");
    const pm = await Paymaster.deploy(ep.address, bundler.address);
    await pm.deployed();
    console.log("==factory addr=", pm.address);

    const SimpleNft = await ethers.getContractFactory("SimpleNft");
    const simpleNft = await SimpleNft.deploy();
    await simpleNft.deployed();
    console.log("==erc721 addr=", simpleNft.address);

    console.log(`==owner balance=`, await getEtherBalance(bundler.address));

    const result = await pm.deposit({ value: ethers.utils.parseEther("2") });
    console.log(`==deposit=`, result);

    const wallets = await Promise.all(
      [1, 2, 3].map(async (salt) => {
        const wallet = await createWallet(factory, salt, bundler);

        // initial balance = 2.0ETH
        await bundler.sendTransaction({
          from: bundler.address,
          to: wallet.walletContract.address,
          value: ethers.utils.parseEther("2"),
        });
        console.log(
          `==account${salt} balance=`,
          wallet.walletContract.address,
          await getEtherBalance(wallet.walletContract.address),
          await wallet.signer.getAddress()
        );
        return wallet;
      })
    );

    const kmsWallet = await createWallet(
      factory,
      0,
      bundler,
      await initKmsSigner("769795065845383179")
    );
    await bundler.sendTransaction({
      from: bundler.address,
      to: kmsWallet.walletContract.address,
      value: ethers.utils.parseEther("2"),
    });
    console.log(
      `==account by KMS balance=`,
      kmsWallet.walletContract.address,
      await getEtherBalance(kmsWallet.walletContract.address),
      await kmsWallet.signer.getAddress()
    );

    console.log(`==owner balance=`, await getEtherBalance(bundler.address));

    await simpleNft.safeMint(wallets[0].walletContract.address, "token1");
    await simpleNft.safeMint(wallets[0].walletContract.address, "token2");
    await simpleNft.safeMint(wallets[1].walletContract.address, "token3");
    await simpleNft.safeMint(kmsWallet.walletContract.address, "token4");

    wallets.forEach(async (wallet, index) => {
      console.log(
        `==account${index} Nft balance=`,
        wallet.walletContract.address,
        await simpleNft.balanceOf(wallet.walletContract.address)
      );
    });
    console.log(
      `==account by KMS  Nft balance=`,
      kmsWallet.walletContract.address,
      await simpleNft.balanceOf(kmsWallet.walletContract.address)
    );

    return {
      ep,
      factory,
      pm,
      simpleNft,
      wallets,
      bundler,
      kmsWallet,
    };
  }

  describe("Ether Transfer", function () {
    it("wallet1 -> wallet2", async function () {
      const { ep, factory, wallets, bundler } = await loadFixture(deploy);
      const userOp = sendEthOperation(wallets[0], wallets[1], "0.1");

      const opHash = await getOpHash(userOp, ep);
      userOp.signature = await calcSignature(wallets[0].signer, opHash);

      const userOpsTx = await ep.handleOps(
        [userOp],
        await bundler.getAddress()
      );
      const result = await userOpsTx.wait();

      await assertEtherBalance(wallets[0], "1.8999999999995"); // 0.1Etherとgasが徴収されている
      await assertEtherBalance(wallets[1], "2.1");
      await assertEtherBalance(wallets[2], "2.0");
      await assertEtherBalance(pm., "2.0");
    });
    it("kmsWallet -> wallet2", async function () {
      const { ep, factory, wallets, bundler, kmsWallet } = await loadFixture(
        deploy
      );
      const userOp = sendEthOperation(kmsWallet, wallets[1], "0.1");

      const opHash = await getOpHash(userOp, ep);
      // const sig = await calcSignature(kmsWallet.signer, opHash);
      const sig = await kmsWallet.signer.signMessage(
        ethers.utils.arrayify(opHash)
      );
      userOp.signature = "0x" + sig;

      const userOpsTx = await ep.handleOps(
        [userOp],
        await bundler.getAddress()
      );
      const result = await userOpsTx.wait();

      await assertEtherBalance(wallets[0], "2.0");
      await assertEtherBalance(wallets[1], "2.1");
      await assertEtherBalance(wallets[2], "2.0");
      await assertEtherBalance(kmsWallet, "1.899999999999500000"); // 0.1Etherとgasが徴収されている
    });
    it("wallet1 -> wallet2 by Paymaster", async function () {
      const { ep, factory, wallets, bundler, kmsWallet, pm } =
        await loadFixture(deploy);
      const userOp = sendEthOperation(wallets[0], wallets[1], "0.1");
      userOp.paymasterAndData = await getPaymasterAndData(userOp, pm, bundler);

      const opHash = await getOpHash(userOp, ep);
      // const sig = await calcSignature(kmsWallet.signer, opHash);
      const sig = await wallets[0].signer.signMessage(
        ethers.utils.arrayify(opHash)
      );
      userOp.signature = sig;

      const userOpsTx = await ep.handleOps(
        [userOp],
        await bundler.getAddress(),
        { gasLimit: 1000000 }
      );
      const result = await userOpsTx.wait();

      await assertEtherBalance(wallets[0], "1.9"); // gasless　0.1Etherのみ徴収されている
      await assertEtherBalance(wallets[1], "2.1");
      await assertEtherBalance(wallets[2], "2.0");
      await assertEtherBalance(kmsWallet, "2.0");
    });
  });

  describe("invalidSignature", function () {
    it("invalidSign--nothing Signature--", async function () {
      const { ep, factory, wallets, bundler } = await loadFixture(deploy);
      const userOp = sendEthOperation(wallets[0], wallets[1], "0.1");

      userOp.signature = "0x";
      const bundlerAddress = await bundler.getAddress();
      await expect(ep.handleOps([userOp], bundlerAddress)).to.be.reverted;

      await assertEtherBalance(wallets[0], "2.0");
      await assertEtherBalance(wallets[1], "2.0");
      await assertEtherBalance(wallets[2], "2.0");
    });
    it("invalidSign--invalid hash--", async function () {
      const { ep, factory, wallets, bundler } = await loadFixture(deploy);
      const userOp = sendEthOperation(wallets[0], wallets[1], "0.1");

      const opHash = keccak256("0x123456");
      userOp.signature = await calcSignature(wallets[0].signer, opHash);
      const bundlerAddress = await bundler.getAddress();
      await expect(ep.handleOps([userOp], bundlerAddress)).to.be.reverted;

      await assertEtherBalance(wallets[0], "2.0");
      await assertEtherBalance(wallets[1], "2.0");
      await assertEtherBalance(wallets[2], "2.0");
    });
  });

  describe("ERC721 Transfer", function () {
    it("wallet1 -> wallet2", async function () {
      const { ep, factory, wallets, simpleNft, bundler } = await loadFixture(
        deploy
      );

      const network = await bundler.provider?.getNetwork();

      const userOp = sendErc721Operation(
        simpleNft,
        wallets[0].walletContract.address,
        wallets[2].walletContract.address,
        1
      );
      const opHash = getUserOpHash(userOp, ep, network?.chainId!);
      console.log("opHash", opHash);
      console.log("wallets[0].signer", await wallets[0].signer.getAddress());
      // userOp.signature = await wallets[0].signer.signMessage(opHash);
      userOp.signature = await wallets[0].signer.signMessage(
        ethers.utils.arrayify(opHash)
      );
      console.log("userOp", userOp);
      const bundlerAddress = await bundler.getAddress();
      const tx = await ep.handleOps([userOp], bundlerAddress, {
        gasLimit: 2000000,
      });
      await tx.wait();

      await assertEtherBalance(wallets[0], "1.99999999999746"); // gasが徴収されている
      await assertEtherBalance(wallets[1], "2.0");
      await assertEtherBalance(wallets[2], "2.0");
      await assertErc721Balance(simpleNft, wallets[0], "1"); // 移転成功
      await assertErc721Balance(simpleNft, wallets[1], "1");
      await assertErc721Balance(simpleNft, wallets[2], "1"); // 移転成功
    });
    it("kmsWallet -> wallet2", async function () {
      const { ep, factory, wallets, bundler, simpleNft, kmsWallet } =
        await loadFixture(deploy);

      const network = await bundler.provider?.getNetwork();

      const userOp = sendErc721Operation(
        simpleNft,
        kmsWallet.walletContract.address,
        wallets[2].walletContract.address,
        3
      );
      const opHash = getUserOpHash(userOp, ep, network?.chainId!);
      console.log("opHash", opHash);
      console.log("wallets[0].signer", await wallets[0].signer.getAddress());

      const sig = await kmsWallet.signer.signMessage(
        ethers.utils.arrayify(opHash)
      );
      userOp.signature = "0x" + sig;
      console.log("userOp", userOp);
      const bundlerAddress = await bundler.getAddress();
      const tx = await ep.handleOps([userOp], bundlerAddress, {
        gasLimit: 2000000,
      });
      const result = await tx.wait();
      console.log(result);

      await assertEtherBalance(wallets[0], "2.0");
      await assertEtherBalance(wallets[1], "2.0");
      await assertEtherBalance(wallets[2], "2.0");
      await assertEtherBalance(kmsWallet, "1.999999999997460000"); // gasが徴収されている
      await assertErc721Balance(simpleNft, wallets[0], "2");
      await assertErc721Balance(simpleNft, wallets[1], "1");
      await assertErc721Balance(simpleNft, wallets[2], "1"); // 移転成功
      await assertErc721Balance(simpleNft, kmsWallet, "0"); // 移転成功
    });
    it("wallet1 -> wallet2 by Paymaster", async function () {
      const { ep, factory, wallets, kmsWallet, bundler, simpleNft, pm } =
        await loadFixture(deploy);
      const network = await bundler.provider?.getNetwork();

      const userOp = sendErc721Operation(
        simpleNft,
        wallets[0].walletContract.address,
        wallets[2].walletContract.address,
        1
      );
      userOp.paymasterAndData = await getPaymasterAndData(userOp, pm, bundler);

      const opHash = getUserOpHash(userOp, ep, network?.chainId!);
      console.log("opHash", opHash);
      const sig = await wallets[0].signer.signMessage(
        ethers.utils.arrayify(opHash)
      );
      userOp.signature = sig;
      console.log("userOp", userOp);
      const bundlerAddress = await bundler.getAddress();
      const tx = await ep.handleOps([userOp], bundlerAddress, {
        gasLimit: 2000000,
      });
      const result = await tx.wait();
      console.log(result);

      await assertEtherBalance(wallets[0], "2.0");
      await assertEtherBalance(wallets[1], "2.0");
      await assertEtherBalance(wallets[2], "2.0");
      await assertErc721Balance(simpleNft, wallets[0], "1");
      await assertErc721Balance(simpleNft, wallets[1], "1");
      await assertErc721Balance(simpleNft, wallets[2], "1");
      await assertErc721Balance(simpleNft, kmsWallet, "1");
    });
  });
});

async function assertEtherBalance(
  wallet: MultisigWallet,
  etherBalance: string
) {
  expect(
    await ethers.provider.getBalance(wallet.walletContract.address)
  ).to.be.equals(ethers.utils.parseEther(etherBalance));
}

async function assertErc721Balance(
  simpleNft: Contract,
  wallet: MultisigWallet,
  erc721Balance: string
) {
  expect(await simpleNft.balanceOf(wallet.walletContract.address)).to.be.equals(
    erc721Balance
  );
}
function sendEthOperation(
  from: MultisigWallet,
  to: MultisigWallet,
  etherValue: string
) {
  return fillUserOpDefaults({
    sender: from.walletContract.address,
    callData: from.walletContract.interface.encodeFunctionData(
      "execute(address,uint,bytes)",
      [to.walletContract.address, ethers.utils.parseEther(etherValue), "0x"]
    ),
    callGasLimit: ethers.utils.parseEther("0.0000000000001"),
  });
}

async function getOpHash(userOp: UserOperation, ep: Contract): Promise<string> {
  const network = await ethers.provider.getNetwork();
  return getUserOpHash(userOp, ep, network.chainId);
}

async function calcSignature(signer: Signer, opHash: string): Promise<string> {
  const sig = await signer.signMessage(ethers.utils.arrayify(opHash));
  console.log("sig:", sig);
  return sig;
}

async function getPaymasterAndData(
  userOp: UserOperation,
  paymaster: Contract,
  signer: Signer
) {
  const MOCK_VALID_UNTIL = "0x00000000deadbeef";
  const MOCK_VALID_AFTER = "0x0000000000001234";
  userOp.paymasterAndData = hexConcat([
    paymaster.address,
    defaultAbiCoder.encode(
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
  return hexConcat([
    paymaster.address,
    defaultAbiCoder.encode(
      ["uint48", "uint48"],
      [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]
    ),
    sig,
  ]);
}
