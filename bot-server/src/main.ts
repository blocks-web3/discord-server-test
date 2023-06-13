import { Client, GatewayIntentBits, Message } from "discord.js";
import dotenv from "dotenv";
import generate from "./api/generate";

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
  } else if (message.content.startsWith("!")) {
    const generated = await generate(message.content.substring(1));
    console.log(generated);
    message.channel.send(
      generated?.reduce(
        (data, current) => data?.concat(current.text || ""),
        ""
      ) || "error occurred"
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
