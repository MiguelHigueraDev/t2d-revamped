import { ChatMessage } from "@twurple/chat";
import { Twitch } from "./Twitch.js";
import { DiscordMessageStrategy, TwitchMessage, TwitchUser } from "../types.js";
import { Webhook } from "../discord/Webhook.js";
import { DiscordClient } from "../discord/DiscordClient.js";
import { AppConfig } from "../AppConfig.js";

export const registerTwitchMessageHandler = async () => {
  const twitch = await Twitch.getInstance();
  const twitchUsername = AppConfig.getInstance().getConfig().twitch.username;

  twitch.clients.unauthenticatedChatClient?.onMessage(
    async (channel: string, user: string, text: string, msg: ChatMessage) => {
      // Ignore messages from the Twitch "bot"
      if (user === twitchUsername) {
        return;
      }

      // Cache message
      const message: TwitchMessage = {
        id: msg.id,
        channel,
        user,
        text,
      };
      twitch.cacheMessage(message);

      // Cache user if not already cached
      const userIsCached = twitch.getUser(user);
      if (!userIsCached) {
        await twitch.clients.apiClient?.users
          .getUserByName(user)
          .then((foundUser) => {
            if (foundUser) {
              const user: TwitchUser = {
                username: foundUser.name,
                displayName: foundUser.displayName,
                profilePictureUrl: foundUser.profilePictureUrl,
              };
              twitch.cacheUser(user);
            }
          })
          .catch((error) => {
            console.error(`Error getting user: ${error}`);
          });
      }

      sendMessageToDiscord(user, text, twitch.getUser(user)?.profilePictureUrl);
    }
  );

  console.log("Twitch message handler registered.");
};

const sendMessageToDiscord = async (
  username: string,
  message: string,
  profilePictureUrl?: string
) => {
  // Send message to Discord using the selected strategy
  const strategy = (await DiscordClient.getInstance()).getMessageStrategy();

  if (strategy === DiscordMessageStrategy.Webhook) {
    sendWebhookMessage(username, message, profilePictureUrl);
  } else if (strategy === DiscordMessageStrategy.Emoji) {
    sendEmojiMessage(username, message);
  } else {
    sendRegularMessage(username, message);
  }
};

// Discord message sending strategies
const sendWebhookMessage = async (
  username: string,
  message: string,
  profilePictureUrl?: string
) => {
  Webhook.sendMessage(username, message, profilePictureUrl);
};

const sendEmojiMessage = async (username: string, message: string) => {
  DiscordClient.sendMessage(username, message);
};

const sendRegularMessage = async (username: string, message: string) => {
  DiscordClient.sendMessage(username, message);
};
