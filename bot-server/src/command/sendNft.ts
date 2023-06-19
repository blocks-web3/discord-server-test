import { CacheType, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from ".";
import { getOrCreateAccount, sendErc721 } from "../api/walletApi";

const command: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("send-item")
    .setDescription("ユーザを指定して自身が保持しているNFTを送付します。")
    .addUserOption((option) =>
      option.setName("to-user").setDescription("target user").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("token-id")
        .setDescription("set token id")
        .setRequired(true)
    ),
  execute: executeLogic,
};

async function executeLogic(interaction: CommandInteraction<CacheType>) {
  const toUser = interaction.options.get("to-user")?.user;
  const tokenId = interaction.options.get("token-id")?.value as number;
  await interaction.deferReply({
    fetchReply: true,
    ephemeral: true,
  });
  const toUserAccount = await getOrCreateAccount(toUser?.id!!);
  const userAccount = await getOrCreateAccount(interaction.user.id);

  const result = await sendErc721(
    userAccount,
    toUserAccount.walletContract.address,
    tokenId
  );

  const fromUserKmsAddress = await userAccount.kmsSigner.getAddress();
  const toUserKmsAddress = await toUserAccount.kmsSigner.getAddress();
  const msg = [
    `sending item.`,
    ``,
    // `result: https://mumbai.polygonscan.com/tx/${result.hash}`,
    `result: https://blockscout.com/astar/tx/${result.hash}`,
    `from address:${userAccount.walletContract.address}`,
    `from owner address:${await userAccount.walletContract.owner()} `,
    `from owner kms address:${fromUserKmsAddress} `,
    `target user:${toUser?.username}`,
    `to address:${toUserAccount.walletContract.address}`,
    `to owner address:${await toUserAccount.walletContract.owner()} `,
    `to owner kms address:${toUserKmsAddress} `,
  ];
  await interaction.followUp({ content: msg.join("\n") });
  return;
}

export default command;
