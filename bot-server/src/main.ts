import {
  Client,
  GatewayIntentBits,
  Message,
  TextBasedChannel,
} from "discord.js";
import dotenv from "dotenv";
import generate from "./api/generate";

dotenv.config();

const history: string[] = [];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once("ready", () => {
  console.log("Ready!");
  console.log(client.user?.tag);
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;
  if (message.content.startsWith("!ping")) {
    message.channel.send("Pong!");
  } else {
    const prompt = message.content.substring(1);
    const generated = await generate(prompt, history);
    if (generated) {
      message.channel.send(generated);
      updateHistory([prompt, generated]);
    }
  }
});

client.on("channelPinsUpdate", async (channel: TextBasedChannel) => {
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

function updateHistory(message: string[]) {
  history.push(...message);
  for (let index = 0; index < history.length - 20; index++) {
    history.pop();
  }
}

client.login(process.env.DISCORD_TOKEN);
