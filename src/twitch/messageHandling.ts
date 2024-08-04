import { T2DInstance } from "./../linking/T2DInstance.js";
import { ChatMessage } from "@twurple/chat";
import { TwitchInstance } from "./TwitchInstance.js";
import { DiscordMessageStrategy, TwitchMsgSentToDiscord } from "../types.js";
import { WebhookInstance } from "../discord/WebhookInstance.js";
import { DiscordInstance } from "../discord/DiscordInstance.js";
import { createDiscordEmoji } from "./emoteHandling.js";
import database from "../database/databaseSetup.js";

export const registerTwitchMessageHandler = async (
  t2dInstance: T2DInstance
) => {
  const twitch = t2dInstance.getTwitchInstance();
  const discord = t2dInstance.getDiscordInstance();
  const webhook = t2dInstance.getWebhookInstance();
  const twitchUsername = t2dInstance.getInstanceConfig().getConfig()
    .twitch.username;

  twitch.clients.unauthenticatedChatClient?.onMessage(
    async (_: string, user: string, text: string, msg: ChatMessage) => {
      // Extract and upload emotes to Discord
      await extractAndUploadEmotes(discord, text, msg);

      const finalMessage = extractMessage(text);
      await cacheMessageAndUser(t2dInstance, user, finalMessage, msg);

      // Replace emotes with their Discord counterparts
      const emotesReplaced = replaceEmotesByEmoji(finalMessage);

      // Don't send bot messages
      if (user !== twitchUsername) {
        sendMessageToDiscord(discord, webhook, {
          username: user,
          text: emotesReplaced,
          profilePictureUrl: twitch.getUser(user)?.profilePictureUrl,
        });
      }

      // After sending the message to Discord, try to find the matching Discord message
      // and link it with the Twitch message
      const matchingDiscordMessage = await findMatchingDiscordMessage(
        discord,
        user,
        emotesReplaced
      );

      if (matchingDiscordMessage) {
        t2dInstance.linkTwitchToDiscord(msg.id, matchingDiscordMessage.id);
      }
    }
  );

  // Deletes the linked Discord message when a Twitch message is deleted
  twitch.clients.unauthenticatedChatClient?.onMessageRemove(
    async (_: string, messageId: string) => {
      const linkedMessageId = t2dInstance.getLinkedDiscordMessage(messageId);

      if (!linkedMessageId) return;
      t2dInstance.deleteLinkedMessageTwitchId(messageId);

      if (t2dInstance.getInstanceConfig().getConfig().discord.useWebhook) {
        await t2dInstance.getWebhookInstance().deleteMessage(linkedMessageId);
      } else {
        await t2dInstance.getDiscordInstance().deleteMessage(linkedMessageId);
      }
    }
  );

  console.log("Twitch message handler registered.");
};

const extractAndUploadEmotes = async (
  discordInstance: DiscordInstance,
  text: string,
  msg: ChatMessage
) => {
  for (const [emoteId, emoteOffsets] of msg.emoteOffsets) {
    // Ranges are in format 'start-end' so we have to use a regex to extract the numbers
    const matches = emoteOffsets[0].match(/^(\d+)-(\d+)$/);
    if (!matches) continue;

    const [_, start, end] = matches;
    const emoteName = text.substring(+start, +end + 1);
    if (!database.emojis.checkIfEmojiIsCached(emoteName)) {
      createDiscordEmoji(discordInstance, emoteId, emoteName);
    }
  }
};

const replaceEmotesByEmoji = (message: string): string => {
  const words = message.split(" ");
  words.map((word) => {
    if (database.emojis.checkIfEmojiIsCached(word)) {
      const { emojiName, emojiId } = database.emojis.getEmojiByName(word);
      message = message.replace(word, `<:${emojiName}:${emojiId}>`);
    }
  });
  return message;
};

// Extract only message from string [D] user: message when the bot sends a message
const extractMessage = (text: string) => {
  const extractedMessage = text.match(/:\s*(.*)/);
  return extractedMessage ? extractedMessage[1] : text;
};

const cacheMessageAndUser = async (
  instance: T2DInstance,
  user: string,
  text: string,
  msg: ChatMessage
) => {
  // Cache all messages, including the ones sent by the bot
  instance.getTwitchInstance().cacheMessage({
    id: msg.id,
    channelId: msg.channelId!,
    user,
    text,
  });

  // Also cache Twitch part in mixed cache (only here because if done in Discord
  // side it would be done twice)
  instance.cacheTwitchPart(msg.id);

  // Cache user if not already cached
  await cacheUser(instance.getTwitchInstance(), user);
};

// Users are cached to avoid making unnecessary API calls to fetch their profile picture
const cacheUser = async (
  twitch: TwitchInstance,
  user: string
): Promise<void> => {
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

const findMatchingDiscordMessage = async (
  discordInstance: DiscordInstance,
  user: string,
  text: string
) => {
  const discordMessages = discordInstance.getCachedMessages();
  return discordMessages.find((msg) => {
    return msg.text === text;
  });
};

const sendMessageToDiscord = async (
  discordInstance: DiscordInstance,
  webhookInstance: WebhookInstance,
  message: TwitchMsgSentToDiscord
) => {
  const strategy = discordInstance.getMessageStrategy();

  if (strategy === DiscordMessageStrategy.Webhook) {
    sendWebhookMessage(
      webhookInstance,
      message.username,
      message.text,
      message.profilePictureUrl
    );
  } else {
    sendRegularMessage(discordInstance, message.username, message.text);
  }
};

// Discord message sending strategies

// Sends a message to Discord using a webhook that has the user's username and profile picture
const sendWebhookMessage = async (
  webhookInstance: WebhookInstance,
  username: string,
  message: string,
  profilePictureUrl?: string
) => {
  webhookInstance.sendMessage(username, message, profilePictureUrl);
};

// Sends a regular or emoji message to Discord (depending on the configuration) with the bot's username
const sendRegularMessage = async (
  discordInstance: DiscordInstance,
  username: string,
  message: string
) => {
  discordInstance.sendMessage(username, message);
};
