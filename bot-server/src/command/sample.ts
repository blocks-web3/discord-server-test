import { CacheType, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from ".";

const command: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  execute: async (interaction: CommandInteraction<CacheType>) => {
    const now = Date.now();
    const msg = ["pong!", "", `gateway: ${interaction.client.ws.ping}ms`];
    await interaction.reply({ content: msg.join("\n"), ephemeral: true });
    await interaction.editReply(
      [...msg, `往復: ${Date.now() - now}ms`].join("\n")
    );
    return;
  },
};

export default command;
