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
    async (channel: string, user: string, text: string, msg: ChatMessage) => {
      // Extract only message from string [D] user: message when the bot sends a message
      const extractedMessage = text.match(/:\s*(.*)/);
      let finalMessage = text;
      if (extractedMessage) finalMessage = extractedMessage[1];

      // Cache all messages, including the ones sent by the bot
      twitch.cacheMessage({
        id: msg.id,
        channel: msg.channelId!,
        user,
        text: finalMessage,
      });

      // Also cache Twitch part in mixed cache (only here because if done in Discord
      // side it would be done twice)
      LinkedCache.getInstance().cacheTwitchMessage(msg.id);

      // Cache user if not already cached
      await cacheUser(twitch, user);

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

  console.log("Twitch message handler registered.");
};

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

const findMatchingDiscordMessage = async (user: string, text: string) => {
  const discordMessages = (
    await DiscordClient.getInstance()
  ).getCachedMessages();
  return discordMessages.find((msg) => {
    // TODO: Check if user is the same
    return msg.text === text;
  });
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
