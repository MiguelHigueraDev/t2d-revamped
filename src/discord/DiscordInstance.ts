import {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { InstanceConfig } from "../InstanceConfig.js";
import {
  DiscordConfig,
  DiscordMessage,
  DiscordMessageStrategy,
} from "../types.js";
import { MAX_CACHED_MESSAGES } from "../constants.js";

export class DiscordInstance {
  private isInitialized: boolean = false;
  private config: InstanceConfig;
  private messageStrategy: DiscordMessageStrategy;
  private textChannel: TextChannel | null;
  private cachedMessages: DiscordMessage[];
  private client: Client;

  public constructor(config: InstanceConfig) {
    this.cachedMessages = [];
    this.config = config;
    this.client = new Client({
      intents: [
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Message],
    });
    this.messageStrategy = this.selectMessageStrategy(
      config.getConfig().discord
    );
    this.textChannel = null;
  }

  public async initClient(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const discordConfig = this.config.getConfig().discord;
    this.client
      .login(discordConfig.botToken)
      .then(() => {
        this.initChannels();
        console.log(
          `Logged in to Discord as user ${this.client.user?.username}!`
        );
      })
      .catch((error) => {
        console.error("Failed to login to Discord:", error);
        throw error;
      });

    this.isInitialized = true;
  }

  private async initChannels(): Promise<void> {
    if (typeof this.textChannel !== null) {
      return;
    }

    const discordConfig = this.config.getConfig().discord;

    this.client.channels.fetch(discordConfig.channelId).then((channel) => {
      if (!channel) {
        throw new Error("Error: Discord channel not found.");
      }

      if (!channel.isTextBased()) {
        throw new Error(
          "Error: Specified Discord channel is not a text channel."
        );
      }

      const textChannel = channel as TextChannel;

      // Check if bot has permission to send and manage messages in the channel
      if (
        !textChannel
          .permissionsFor(this.client.user!)
          ?.has(PermissionFlagsBits.SendMessages)
      ) {
        throw new Error(
          "Error: Bot does not have permission to send messages in the specified channel."
        );
      }

      if (
        !textChannel
          .permissionsFor(this.client.user!)
          ?.has(PermissionFlagsBits.ManageMessages)
      ) {
        throw new Error(
          "Error: Bot does not have permission to manage messages in the specified channel."
        );
      }

      this.textChannel = textChannel;
    });

    this.isInitialized = true;
  }

  /**
   * Caches a Discord message.
   * @param message The message to be cached.
   */
  public cacheMessage(message: DiscordMessage): void {
    this.cachedMessages.push(message);
    if (this.cachedMessages.length > MAX_CACHED_MESSAGES) {
      this.cachedMessages.shift();
    }
  }

  public getCachedMessages(): DiscordMessage[] {
    return this.cachedMessages;
  }

  public deleteCachedMessage(messageId: string): void {
    this.cachedMessages.filter((message) => message.id !== messageId);
  }

  /**
   * Sends a message to the Discord channel.
   *
   * @param username - The username of the sender.
   * @param message - The message to be sent.
   * @returns A Promise that resolves when the message is sent.
   */
  public async sendMessage(username: string, message: string): Promise<void> {
    const emojiId = this.config.getConfig().discord.emojiId;
    const emojiName = this.config.getConfig().discord.emojiName;

    const textChannel = this.textChannel;
    const emojiString =
      emojiId && emojiName ? `<:${emojiName}:${emojiId}> ` : "";

    textChannel!.send(`${emojiString}**${username}**: ${message}`);
  }

  public async deleteMessage(messageId: string): Promise<void> {
    const textChannel = this.textChannel;

    textChannel!.messages.fetch(messageId).then((fetchedMessage) => {
      try {
        fetchedMessage.delete();
      } catch (error) {
        console.error(
          `Failed to delete Discord bot message with ID ${messageId}: \n${error}`
        );
      }
    });
  }

  public getMessageStrategy(): DiscordMessageStrategy {
    return this.messageStrategy;
  }

  public getTextChannel(): TextChannel | null {
    return this.textChannel;
  }

  public getClient(): Client {
    return this.client;
  }

  private selectMessageStrategy(config: DiscordConfig): DiscordMessageStrategy {
    // Select the appropriate message strategy based on the config
    if (config.useWebhook) {
      if (!config.webhookId || !config.webhookToken) {
        throw new Error(
          "Webhook ID and token must be provided in the config file to use the Webhook strategy."
        );
      }
      return DiscordMessageStrategy.Webhook;
    } else if (config.emojiId && config.emojiName) {
      return DiscordMessageStrategy.Emoji;
    } else {
      return DiscordMessageStrategy.Regular;
    }
  }
}
