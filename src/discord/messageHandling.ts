import { Events, Message, PartialMessage } from "discord.js";
import { DiscordClient } from "./DiscordClient.js";
import { AppConfig } from "../AppConfig.js";
import { Twitch } from "../twitch/Twitch.js";
import { LinkedCache } from "../linking/LinkedCache.js";
import { TwitchMessage } from "../types.js";

export const registerDiscordMessageHandlers = async () => {
  const discord = await DiscordClient.getInstance();

  discord.getClient().on(Events.MessageCreate, handleMessageCreation);
  discord.getClient().on(Events.MessageDelete, handleMessageDeletion);

  console.log("Discord message handlers registered.");
};

const handleMessageCreation = async (message: Message) => {
  const discord = await DiscordClient.getInstance();
  const config = AppConfig.getInstance().getConfig().discord;
  const twitch = await Twitch.getInstance();
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
  const matchingTwitchMessage = await findMatchingTwitchMessage(username, text);

  if (matchingTwitchMessage) {
    LinkedCache.getInstance().linkDiscordMessageToTwitchMessage(
      messageId,
      matchingTwitchMessage.id
    );
  }
};

// Deletes the linked Twitch message when a Discord message is deleted
const handleMessageDeletion = async (message: Message | PartialMessage) => {
  const messageId = message.id;
  const linkedMessageId =
    LinkedCache.getInstance().getLinkedTwitchMessage(messageId);

  if (!linkedMessageId) return;
  const twitchMessage = (await Twitch.getInstance()).getCachedMessage(
    linkedMessageId
  );

  if (!twitchMessage) return;
  LinkedCache.getInstance().deleteLinkedMessageDiscordId(messageId);
  (await Twitch.getInstance()).deleteMessage(twitchMessage);
};

// Finds the matching Twitch message in the cache to link it with the Discord message
const findMatchingTwitchMessage = async (
  username: string,
  message: string
): Promise<TwitchMessage | undefined> => {
  const twitchMessages = (await Twitch.getInstance()).getCachedMessages();
  return twitchMessages.find((msg) => {
    return msg.text === message && msg.user === username;
  });
};
