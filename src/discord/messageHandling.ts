import { Events } from "discord.js";
import { DiscordClient } from "./DiscordClient.js";
import { AppConfig } from "../AppConfig.js";
import { Twitch } from "../twitch/Twitch.js";

export const registerDiscordMessageHandler = async () => {
  const discordClient = (await DiscordClient.getInstance()).getClient();
  const config = AppConfig.getInstance().getConfig().discord;
  const twitch = await Twitch.getInstance();

  discordClient.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) {
      return;
    }

    if (message.channelId === config.channelId) {
      const username = message.author.username;
      const messageText = message.content;
      twitch.sendMessage(username, messageText);
    }
  });

  console.log("Discord message handler registered.");
};
