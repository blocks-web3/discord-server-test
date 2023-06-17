import { CacheType, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from ".";

const command: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("get-rank")
    .setDescription("コミュニティのランキングを表示します。"),
  execute: async (interaction: CommandInteraction<CacheType>) => {
    const msg = ["最新のランキングです！", "", `集計中...`];
    await interaction.reply({ content: msg.join("\n"), ephemeral: false });
    if (!interaction.isCommand()) {
      return;
    }
    return;
  },
};

export default command;
