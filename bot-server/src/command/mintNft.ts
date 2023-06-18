import { CacheType, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from ".";
import { getOrCreateAccount, mintNft } from "../api/walletApi";

const nftAssets = new Map<string, NftAsset>();
type NftAsset = {
  contractAddress: string;
  tokenUri: string;
};

nftAssets.set("ticket-1", {
  contractAddress: process.env.NFT_CONTRACT_ADDR!!,
  tokenUri:
    "https://magenta-few-pig-492.mypinata.cloud/ipfs/QmXEchKpCQCioNfdSmf31mqKgyC8kc7wJ11HQVVSvP1Ezu/metadata.json",
});

nftAssets.set("item-1", {
  contractAddress: process.env.NFT_CONTRACT_ADDR!!,
  tokenUri:
    "https://magenta-few-pig-492.mypinata.cloud/ipfs/QmXEchKpCQCioNfdSmf31mqKgyC8kc7wJ11HQVVSvP1Ezu/metadata.json",
});

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
        .setDescription(` "ticket-1","item-1"から選択してください`)
        .setRequired(true)
    ),
  execute: executeLogic,
};

async function executeLogic(interaction: CommandInteraction<CacheType>) {
  const toUser = interaction.options.get("to-user")?.user;
  const nftAssetId = interaction.options.get("nft-asset-id")?.value as string;
  await interaction.deferReply({
    fetchReply: true,
    ephemeral: true,
  });
  const account = await getOrCreateAccount(toUser?.id!!);

  const nftAsset = nftAssets.get(nftAssetId);
  if (!nftAsset) {
    const msg = [`nft asset not found.`];
    await interaction.followUp({ content: msg.join("\n") });
    return;
  }

  const result = await mintNft(
    account.walletContract.address,
    nftAsset.tokenUri
  );

  const msg = [
    `complete minting token.`,
    ``,
    `result: https://mumbai.polygonscan.com/tx/${result.hash}`,
    `target user:${toUser?.username}`,
    `to address:${account.walletContract.address}`,
    // `token id:${tokenId}`, TODO tokenIdを取得する
    result,
  ];
  await interaction.followUp({ content: msg.join("\n") });
  return;
}

export default command;
