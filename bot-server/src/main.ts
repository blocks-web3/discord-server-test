import {
  CacheType,
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  Message,
  TextBasedChannel,
} from "discord.js";
import dotenv from "dotenv";
import generate from "./api/generate";
import commands from "./command";
dotenv.config();

const history: string[] = [];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once(Events.ClientReady, async () => {
  console.log("Ready!");
  console.log(client.user?.tag);
  await initCommands();
});

client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot) return;
  if (message.content.startsWith("!ping")) {
    message.channel.send("Pong!");
  } else if (message.content.startsWith("!")) {
    const prompt = message.content.substring(1);
    const generated = await generate(prompt, history);
    if (generated) {
      message.channel.send(generated);
      updateHistory([prompt, generated]);
    }
  }
});

client.on(Events.ChannelPinsUpdate, async (channel: TextBasedChannel) => {
  console.log(channel);
  const generated = await generate(
    `${channel}さんがコミュニティに参加したので、ウェルカムメッセージをお願いします。`,
    history
  );
  if (generated) {
    channel.send(generated);
    updateHistory([generated]);
  }
});

client.on(
  Events.InteractionCreate,
  async (interaction: Interaction<CacheType>) => {
    if (interaction.isCommand()) {
      const targetCommand = commands.find(
        (command) => command.data.name === interaction.commandName
      );
      if (targetCommand) {
        targetCommand.execute(interaction);
      }
    }
    if (interaction.isModalSubmit()) {
      const targetCommand = commands.find(
        (command) => command.data.name === interaction.customId
      );
      if (targetCommand && targetCommand.modalSubmit) {
        targetCommand.modalSubmit(interaction);
      }
    }
  }
);

function updateHistory(message: string[]) {
  history.push(...message);
  for (let index = 0; index < history.length - 20; index++) {
    history.pop();
  }
}

/**
 * SlashCommandの登録
 */
async function initCommands() {
  // 一度全ての設定を削除
  const guild = client.guilds.cache.get("1118228068079784019");
  await guild?.commands.set([]);

  const commandSetResult = await client.application?.commands.set(
    commands.map((command) => command.data)
  );
}

client.login(process.env.DISCORD_TOKEN);
