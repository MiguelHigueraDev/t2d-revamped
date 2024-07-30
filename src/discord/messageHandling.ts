import { Events } from "discord.js";
import { DiscordClient } from "./DiscordClient.js";
import { AppConfig } from "../AppConfig.js";
import { Twitch } from "../twitch/Twitch.js";
import { LinkedCache } from "../linking/LinkedCache.js";

export const registerDiscordMessageHandler = async () => {
  const discord = await DiscordClient.getInstance();
  const config = AppConfig.getInstance().getConfig().discord;
  const twitch = await Twitch.getInstance();

  discord.getClient().on(Events.MessageCreate, async (message) => {
    const {
      id: messageId,
      channelId,
      content: text,
      author: { id: userId, username },
    } = message;

    // Cache message
    discord.cacheMessage({
      id: messageId,
      channelId,
      text,
      userId,
    });

    // Don't send bot messages
    if (!message.author.bot) {
      if (message.channelId === config.channelId) {
        await twitch.sendMessage(username, text);
      }
    }

    // After sending the message to Twitch, try to find the matching Twitch message
    // and link it with the Discord message
    const matchingTwitchMessage = await findMatchingTwitchMessage(
      username,
      text
    );

    if (matchingTwitchMessage) {
      LinkedCache.getInstance().linkDiscordMessageToTwitchMessage(
        messageId,
        matchingTwitchMessage.id
      );
    }

    console.table(LinkedCache.getInstance().getCachedMessages());
  });

  console.log("Discord message handler registered.");
};

// Finds the matching Twitch message in the cache to link it with the Discord message
const findMatchingTwitchMessage = async (username: string, message: string) => {
  const twitchMessages = (await Twitch.getInstance()).getCachedMessages();
  return twitchMessages.find((msg) => {
    return msg.text === message && msg.user === username;
  });
};
