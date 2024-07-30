import { ChatMessage } from "@twurple/chat";
import { Twitch } from "./Twitch.js";
import { DiscordMessageStrategy } from "../types.js";
import { Webhook } from "../discord/Webhook.js";
import { DiscordClient } from "../discord/DiscordClient.js";
import { AppConfig } from "../AppConfig.js";
import { LinkedCache } from "../linking/LinkedCache.js";

export const registerTwitchMessageHandler = async () => {
  const twitch = await Twitch.getInstance();
  const twitchUsername = AppConfig.getInstance().getConfig().twitch.username;

  twitch.clients.unauthenticatedChatClient?.onMessage(
    async (_: string, user: string, text: string, msg: ChatMessage) => {
      const finalMessage = extractMessage(text);

      await cacheMessageAndUser(twitch, user, finalMessage, msg);

      // Don't send bot messages
      if (user !== twitchUsername) {
        sendMessageToDiscord(
          user,
          text,
          twitch.getUser(user)?.profilePictureUrl
        );
      }

      // After sending the message to Discord, try to find the matching Discord message
      // and link it with the Twitch message
      const matchingDiscordMessage = await findMatchingDiscordMessage(
        user,
        finalMessage
      );

      if (matchingDiscordMessage) {
        LinkedCache.getInstance().linkTwitchMessageToDiscordMessage(
          msg.id,
          matchingDiscordMessage.id
        );
      }
    }
  );

  // Deletes the linked Discord message when a Twitch message is deleted
  twitch.clients.unauthenticatedChatClient?.onMessageRemove(
    async (_: string, messageId: string) => {
      const linkedMessageId =
        LinkedCache.getInstance().getLinkedDiscordMessage(messageId);

      if (!linkedMessageId) return;
      LinkedCache.getInstance().deleteLinkedMessageTwitchId(messageId);
      if (AppConfig.getInstance().getConfig().discord.useWebhook) {
        await Webhook.deleteMessage(linkedMessageId);
      } else {
        await DiscordClient.deleteMessage(linkedMessageId);
      }
    }
  );

  console.log("Twitch message handler registered.");
};

// Extract only message from string [D] user: message when the bot sends a message
const extractMessage = (text: string) => {
  const extractedMessage = text.match(/:\s*(.*)/);
  return extractedMessage ? extractedMessage[1] : text;
};

const cacheMessageAndUser = async (
  twitch: Twitch,
  user: string,
  text: string,
  msg: ChatMessage
) => {
  // Cache all messages, including the ones sent by the bot
  twitch.cacheMessage({
    id: msg.id,
    channelId: msg.channelId!,
    user,
    text,
  });

  // Also cache Twitch part in mixed cache (only here because if done in Discord
  // side it would be done twice)
  LinkedCache.getInstance().cacheTwitchMessage(msg.id);

  // Cache user if not already cached
  await cacheUser(twitch, user);
};

// Users are cached to avoid making unnecessary API calls to fetch their profile picture
const cacheUser = async (twitch: Twitch, user: string): Promise<void> => {
  const userIsCached = twitch.getUser(user);
  if (userIsCached) {
    return;
  }

  await twitch.clients.apiClient?.users
    .getUserByName(user)
    .then((foundUser) => {
      if (foundUser) {
        twitch.cacheUser({
          username: foundUser.name,
          displayName: foundUser.displayName,
          profilePictureUrl: foundUser.profilePictureUrl,
        });
      }
    })
    .catch((error) => {
      console.error(`Error getting user: ${error}`);
    });
};

const findMatchingDiscordMessage = async (user: string, text: string) => {
  const discordMessages = (
    await DiscordClient.getInstance()
  ).getCachedMessages();
  return discordMessages.find((msg) => {
    return msg.text === text;
  });
};

const sendMessageToDiscord = async (
  username: string,
  message: string,
  profilePictureUrl?: string
) => {
  const strategy = (await DiscordClient.getInstance()).getMessageStrategy();

  if (strategy === DiscordMessageStrategy.Webhook) {
    sendWebhookMessage(username, message, profilePictureUrl);
  } else {
    sendRegularMessage(username, message);
  }
};

// Discord message sending strategies

// Sends a message to Discord using a webhook that has the user's username and profile picture
const sendWebhookMessage = async (
  username: string,
  message: string,
  profilePictureUrl?: string
) => {
  Webhook.sendMessage(username, message, profilePictureUrl);
};

// Sends a regular or emoji message to Discord (depending on the configuration) with the bot's username
const sendRegularMessage = async (username: string, message: string) => {
  DiscordClient.sendMessage(username, message);
};
