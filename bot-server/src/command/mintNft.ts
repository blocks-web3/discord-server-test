import { CacheType, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from ".";
import { createAccount } from "../api/walletApi";

const command: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("mint-nft")
    .setDescription("ユーザを指定してNFTをミントします。")
    .addUserOption((option) =>
      option.setName("to-user").setDescription("target user").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("token-id").setDescription("token id").setRequired(true)
    ),
  execute: executeLogic,
  // modalSubmit: modalSubmitLogic,
};

async function executeLogic(interaction: CommandInteraction<CacheType>) {
  const toUser = interaction.options.get("to-user");
  const tokenId = interaction.options.get("token-id");

  const salt = 0; // 1ユーザにつき1AccountでひとまずOK
  const account = await createAccount(toUser?.user?.id!!, salt);

  // const msg1 = [
  //   `minting token...`,
  //   ``,
  //   `target user:${toUser?.user?.username}`,
  //   `to address:${"0xXXXX...YYYY"}`,
  //   `token id:${tokenId}`,
  // ];
  // await interaction.reply({ content: msg1.join("\n"), ephemeral: true });

  // const modal = new ModalBuilder()
  //   .setCustomId(command.data.name)
  //   .setTitle(command.data.description);

  // const favoriteColorInput = new TextInputBuilder()
  //   .setCustomId("favoriteColorInput")
  //   // The label is the prompt the user sees for this input
  //   .setLabel("What's your favorite color?")
  //   // Short means only a single line of text
  //   .setStyle(TextInputStyle.Short);

  // const hobbiesInput = new TextInputBuilder()
  //   .setCustomId("hobbiesInput")
  //   .setLabel("What's some of your favorite hobbies?")
  //   // Paragraph means multiple lines of text.
  //   .setStyle(TextInputStyle.Paragraph)
  //   .setMaxLength(10)
  //   .setMinLength(8);

  // const firstActionRow =
  //   new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
  //     hobbiesInput
  //   );
  // // const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);
  // modal.addComponents([firstActionRow]);

  // await interaction.showModal(modal);

  const msg2 = [
    `complete minting token.`,
    ``,
    `tx id: ${toUser?.user?.username}`,
    `url: https://mumbai.polygonscan.com/address/${account.walletContract.address}`,
    `target user:${toUser?.user?.username}`,
    `to address:${account.walletContract.address}`,
    `token id:${tokenId}`,
  ];
  await interaction.reply({ content: msg2.join("\n"), ephemeral: false });
  return;
}

// async function modalSubmitLogic(
//   interaction: ModalSubmitInteraction<CacheType>
// ) {
//   const toUser = interaction.fields.getField("to-user");
//   const tokenId = interaction.options.get("token-id");

//   const msg1 = [
//     `minting token...`,
//     ``,
//     `target user:${toUser?.user?.username}`,
//     `to address:${"0xXXXX...YYYY"}`,
//     `token id:${tokenId}`,
//   ];
//   // await interaction.reply({ content: msg1.join("\n"), ephemeral: true });

//   const modal = new ModalBuilder().setCustomId("myModal").setTitle("My Modal");

//   const favoriteColorInput = new TextInputBuilder()
//     .setCustomId("favoriteColorInput")
//     // The label is the prompt the user sees for this input
//     .setLabel("What's your favorite color?")
//     // Short means only a single line of text
//     .setStyle(TextInputStyle.Short);

//   const hobbiesInput = new TextInputBuilder()
//     .setCustomId("hobbiesInput")
//     .setLabel("What's some of your favorite hobbies?")
//     // Paragraph means multiple lines of text.
//     .setStyle(TextInputStyle.Paragraph)
//     .setMaxLength(10)
//     .setMinLength(8);
//   const button = new ButtonBuilder();

//   const firstActionRow =
//     new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
//       hobbiesInput
//     );
//   // const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);
//   modal.addComponents([firstActionRow]);

//   await interaction.showModal(modal);

//   const msg2 = [
//     `complete minting token.`,
//     ``,
//     `tx id: ${toUser?.user?.username}`,
//     `url: https://polygonscan/${""}`,
//   ];
//   await interaction.reply({ content: msg2.join("\n"), ephemeral: true });
//   return;
// }

export default command;
