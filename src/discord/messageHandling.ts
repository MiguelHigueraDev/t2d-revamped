import { Events, Message, PartialMessage } from "discord.js";
import { TwitchInstance } from "../twitch/TwitchInstance.js";
import { DiscordConfig, TwitchMessage } from "../types.js";
import { T2DInstance } from "../linking/T2DInstance.js";

export const registerDiscordMessageHandlers = async (
  t2dInstance: T2DInstance
) => {
  t2dInstance
    .getDiscordInstance()
    .getClient()
    .on(Events.MessageCreate, (msg) => handleMessageCreation(msg, t2dInstance));
  t2dInstance
    .getDiscordInstance()
    .getClient()
    .on(Events.MessageDelete, (msg) => handleMessageDeletion(msg, t2dInstance));

  console.log("Discord message handlers registered.");
};

const handleMessageCreation = async (
  message: Message,
  instance: T2DInstance
) => {
  const config: DiscordConfig = instance
    .getInstanceConfig()
    .getConfig().discord;
  const twitch: TwitchInstance = instance.getTwitchInstance();
  const {
    id: messageId,
    channelId,
    content: text,
    author: { id: userId, username },
  } = message;

  // Cache message
  instance.getDiscordInstance().cacheMessage({
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
    instance,
    username,
    text
  );

  if (matchingTwitchMessage) {
    instance.linkDiscordToTwitch(messageId, matchingTwitchMessage.id);
  }
};

// Deletes the linked Twitch message when a Discord message is deleted
const handleMessageDeletion = async (
  message: Message | PartialMessage,
  instance: T2DInstance
) => {
  const messageId = message.id;
  const linkedMessageId = instance.getLinkedTwitchMessage(messageId);

  if (!linkedMessageId) return;
  const twitchMessage = instance
    .getTwitchInstance()
    .getCachedMessage(linkedMessageId);

  if (!twitchMessage) return;
  instance.deleteLinkedMessageDiscordId(messageId);
  await instance.getTwitchInstance().deleteMessage(twitchMessage);
};

// Finds the matching Twitch message in the cache to link it with the Discord message
const findMatchingTwitchMessage = async (
  instance: T2DInstance,
  username: string,
  message: string
): Promise<TwitchMessage | undefined> => {
  const twitchMessages = instance.getTwitchInstance().getCachedMessages();
  return twitchMessages.find((msg) => {
    return msg.text === message && msg.user === username;
  });
};
