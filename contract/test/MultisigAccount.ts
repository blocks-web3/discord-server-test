import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { keccak256 } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { MultisigWallet, createWallet, getEtherBalance } from "../src/Util";
import {
  UserOperation,
  fillUserOpDefaults,
  getUserOpHash,
} from "./UserOperation";
import { initKmsSigner, sendErc721Operation } from "./walletApi";

describe("MultisigAccount", function () {
  async function deploy() {
    const [bundler] = await ethers.getSigners();
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const ep = await EntryPoint.deploy();
    await ep.deployed();
    console.log("==entrypoint addr=", ep.address);

    const Factory = await ethers.getContractFactory("MultisigAccountFactory");
    const factory = await Factory.deploy(ep.address);
    await factory.deployed();
    console.log("==factory addr=", factory.address);

    const SimpleNft = await ethers.getContractFactory("SimpleNft");
    const simpleNft = await SimpleNft.deploy();
    await simpleNft.deployed();
    console.log("==erc721 addr=", simpleNft.address);

    console.log(`==owner balance=`, await getEtherBalance(bundler.address));

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
      userOp.signature = await calcSignature(userOp, wallets[0].signer, opHash);

      const userOpsTx = await ep.handleOps(
        [userOp],
        await bundler.getAddress()
      );
      const result = await userOpsTx.wait();

      // expect(
      //   await ethers.provider.getBalance(wallets[0].walletContract.address)
      // ).to.be.equals(ethers.utils.parseEther("1.9").sub(result.gasUsed));
      // TODO: TXのガス消費以上に徴収されている？ロジックを確認
      await assertEtherBalance(wallets[0], "1.899999999999729");
      await assertEtherBalance(wallets[1], "2.1");
      await assertEtherBalance(wallets[2], "2.0");
    });
    it("wallet1 -> wallet2 by KMS", async function () {
      const { ep, factory, wallets, bundler, kmsWallet } = await loadFixture(
        deploy
      );
      const userOp = sendEthOperation(kmsWallet, wallets[1], "0.1");

      const opHash = await getOpHash(userOp, ep);
      // const sig = await calcSignature(userOp, kmsWallet.signer, opHash);
      const sig = await kmsWallet.signer.signMessage(
        ethers.utils.arrayify(opHash)
      );
      // const buffer = Buffer.from(sig);
      // const r = buffer.slice(0, 32);
      // const s = buffer.slice(32, 64);
      // const v = buffer.readUInt8(64);
      // const signature = joinSignature({
      //   r: "0x" + r.toString(),
      //   s: "0x" + s.toString(),
      //   recoveryParam: v,
      // });

      // console.log("==sig=", signature);
      userOp.signature = "0x" + sig;

      const userOpsTx = await ep.handleOps(
        [userOp],
        await bundler.getAddress()
      );
      const result = await userOpsTx.wait();

      // expect(
      //   await ethers.provider.getBalance(wallets[0].walletContract.address)
      // ).to.be.equals(ethers.utils.parseEther("1.9").sub(result.gasUsed));
      // TODO: TXのガス消費以上に徴収されている？ロジックを確認
      await assertEtherBalance(wallets[0], "2.0");
      await assertEtherBalance(wallets[1], "2.1");
      await assertEtherBalance(wallets[2], "2.0");
      await assertEtherBalance(kmsWallet, "1.899999999999500000");
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
      userOp.signature = await calcSignature(userOp, wallets[0].signer, opHash);
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

      await assertEtherBalance(wallets[0], "1.99999999999772");
      await assertEtherBalance(wallets[1], "2.0");
      await assertEtherBalance(wallets[2], "2.0");
      await assertErc721Balance(simpleNft, wallets[0], "1");
      await assertErc721Balance(simpleNft, wallets[1], "1");
      await assertErc721Balance(simpleNft, wallets[2], "1");
    });
    it.only("wallet1 -> wallet2 KMS", async function () {
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
      await tx.wait();

      await assertEtherBalance(wallets[0], "2.0");
      await assertEtherBalance(wallets[1], "2.0");
      await assertEtherBalance(wallets[2], "2.0");
      await assertErc721Balance(simpleNft, wallets[0], "2");
      await assertErc721Balance(simpleNft, wallets[1], "1");
      await assertErc721Balance(simpleNft, wallets[2], "1");
      await assertErc721Balance(simpleNft, kmsWallet, "0");
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

async function calcSignature(
  userOp: UserOperation,
  signer: Signer,
  opHash: string
): Promise<string> {
  const sig = await signer.signMessage(ethers.utils.arrayify(opHash));
  console.log("sig:", sig);
  return sig;
}
