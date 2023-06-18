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
    ephemeral: true,
  });

  const account = await getAccount(targetUser.id);
  const collection = await getCollection(account.walletContract.address);

  console.log(collection);

  if (collection.length === 0) {
    const msg = [`${targetUser.username} has no tokens.`];
    await interaction.followUp({ content: msg.join("\n") });
  } else {
    const msg = [
      `${targetUser.username}'s collection is here.`,
      ``,
      collection,
    ];
    await interaction.followUp({ content: msg.join("\n") });
  }
  return;
}

export default command;
