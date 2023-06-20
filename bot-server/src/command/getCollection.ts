import { CacheType, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from ".";
import { getAccount, getCollection } from "../api/walletApi";

const command: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("get-collection")
    .setDescription("アイテムのコレクションを表示します。")
    .addUserOption((option) =>
      option
        .setName("owner")
        .setDescription("select collection owner")
        .setRequired(false)
    ),
  execute: executeLogic,
};

async function executeLogic(interaction: CommandInteraction<CacheType>) {
  const targetUser = interaction.options.get("owner")?.user || interaction.user;
  await interaction.deferReply({
    fetchReply: true,
    ephemeral: false,
  });

  const account = await getAccount(targetUser.id);
  let tokenIds = await getCollection(account.walletContract.address);
  tokenIds = tokenIds.filter((tokenId) => ![3, 4, 5].includes(tokenId));

  if (tokenIds.length === 0) {
    const msg = [`${targetUser.username} has no tokens.`];
    await interaction.followUp({ content: msg.join("\n") });
  } else {
    const msg = [
      `${targetUser.username}'s collection is here.`,
      ``,
      tokenIds
        .map((tokenId) => {
          return `[Empowerment Link Games Item#${tokenId}](https://tofunft.com/nft/astar/0xEA0010a402d35540a3988973106909f155FB8572/${tokenId})`;
        })
        .join("\n"),
    ];
    await interaction.followUp({ content: msg.join("\n") });
  }
  return;
}

export default command;
