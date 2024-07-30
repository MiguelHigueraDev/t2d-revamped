import { LinkedMessage } from "../types.js";

// This class is used to store cached IDs of Discord and Twitch messages to link them together.
export class LinkedCache {
  private static instance: LinkedCache;
  private cachedMessages: LinkedMessage[] = [];

  private constructor() {}

  public static getInstance(): LinkedCache {
    if (!LinkedCache.instance) {
      LinkedCache.instance = new LinkedCache();
    }
    return LinkedCache.instance;
  }

  public getCachedMessages(): LinkedMessage[] {
    return this.cachedMessages;
  }

  public cacheDiscordMessage(messageId: string): void {
    if (!this.cachedMessages.find((m) => m.discordMessageId === messageId)) {
      this.cachedMessages.push({ discordMessageId: messageId });
    }
  }

  public cacheTwitchMessage(messageId: string): void {
    if (!this.cachedMessages.find((m) => m.twitchMessageId === messageId)) {
      this.cachedMessages.push({ twitchMessageId: messageId });
    }
  }

  public linkDiscordMessageToTwitchMessage(
    discordMessageId: string,
    twitchMessageId: string
  ): void {
    const discordMessage = this.cachedMessages.find(
      (m) => m.discordMessageId === discordMessageId
    );
    if (discordMessage) {
      discordMessage.twitchMessageId = twitchMessageId;
    }
  }

  public linkTwitchMessageToDiscordMessage(
    twitchMessageId: string,
    discordMessageId: string
  ): void {
    const twitchMessage = this.cachedMessages.find(
      (m) => m.twitchMessageId === twitchMessageId
    );
    if (twitchMessage) {
      twitchMessage.discordMessageId = discordMessageId;
    }
  }
}
