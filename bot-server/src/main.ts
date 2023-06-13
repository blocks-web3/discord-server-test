import { Client, GatewayIntentBits, Message } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

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
  }
});

client.login(process.env.DISCORD_TOKEN);
