import { CacheType, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from ".";
import { getOrCreateAccount, mintNft } from "../api/walletApi";

// TODO: マスタデータとしてDB管理する
const nftAssets: { [key: string]: nftAsset } = {
  "sword-1": {
    contractAddress: process.env.NFT_CONTRACT_ADDR!!,
    tokenUriHash: "QmUYoAFuPjeZ63Cmb5LbfQ7GdqS43kGwWvoLpZZcm2sdBP",
  },
  "shield-1": {
    contractAddress: process.env.NFT_CONTRACT_ADDR!!,
    tokenUriHash: "QmVJbsSF9TNsajM2b8DsvK5bkAMF2UrCWGcsRbC93FqKNx",
  },
  "helm-1": {
    contractAddress: process.env.NFT_CONTRACT_ADDR!!,
    tokenUriHash: "QmRvGEYKFYg9gKWydJis8NtAVnU81P9MM7fAvLTkGaWrBz",
  },
};

type nftAssetId = keyof typeof nftAssets;

type nftAsset = {
  contractAddress: string;
  tokenUriHash: string;
};

const command: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("mint-nft")
    .setDescription("ユーザを指定してNFTをミントします。")
    .addUserOption((option) =>
      option.setName("to-user").setDescription("target user").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("nft-asset-id")
        .setDescription(` 付与したいアセットを選択してください`)
        .setRequired(true)
        .addChoices(
          ...Object.entries(nftAssets).map((entry) => {
            return { name: entry[0], value: entry[0] };
          })
        )
    ),
  execute: executeLogic,
};

async function executeLogic(interaction: CommandInteraction<CacheType>) {
  const toUser = interaction.options.get("to-user")?.user;
  const nftAssetId = interaction.options.get("nft-asset-id")
    ?.value as nftAssetId;
  await interaction.deferReply({
    fetchReply: true,
    ephemeral: true,
  });
  const account = await getOrCreateAccount(toUser?.id!!);

  const nftAsset = nftAssets[nftAssetId];
  if (!nftAsset) {
    const msg = [`nft asset not found. nft-asset-id: ${nftAssetId}`];
    await interaction.followUp({ content: msg.join("\n") });
    return;
  }

  const result = await mintNft(
    account.walletContract.address,
    nftAsset.tokenUriHash
  );

  const msg = [
    `complete minting token.`,
    ``,
    `result: https://mumbai.polygonscan.com/tx/${result.hash}`,
    `target user:${toUser?.username}`,
    `to address:${account.walletContract.address}`,
    // `token id:${tokenId}`, TODO tokenIdを取得する
  ];
  await interaction.followUp({ content: msg.join("\n") });
  return;
}

export default command;
