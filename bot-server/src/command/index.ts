import {
  CacheType,
  CommandInteraction,
  ModalSubmitInteraction,
  SlashCommandBuilder,
} from "discord.js";
import getRank from "./getRank";
import mintNft from "./mintNft";
import sample from "./sample";

type CustomCommand = {
  data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: CommandInteraction<CacheType>) => Promise<void>;
  modalSubmit?: (
    interaction: ModalSubmitInteraction<CacheType>
  ) => Promise<void>;
};
export default [sample, getRank, mintNft];
export type { CustomCommand };