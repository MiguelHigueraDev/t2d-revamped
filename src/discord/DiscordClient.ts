import { Client, TextBasedChannel, TextChannel } from "discord.js";
import { AppConfig } from "../AppConfig.js";
import { DiscordConfig, DiscordMessageStrategy } from "../types.js";

export class DiscordClient {
  private static instance: DiscordClient;
  private client: Client = new Client({ intents: ["Guilds", "GuildMessages"] });
  private messageStrategy: DiscordMessageStrategy =
    DiscordMessageStrategy.Regular;
  private textChannel: TextChannel | null = null;

  private constructor() {}

  public static async getInstance(): Promise<DiscordClient> {
    if (!DiscordClient.instance) {
      DiscordClient.instance = new DiscordClient();
      await DiscordClient.instance.init();
    }
    return DiscordClient.instance;
  }

  private async init(): Promise<void> {
    const config = AppConfig.getInstance().getConfig().discord;
    this.selectMessageStrategy(config);
    this.client
      .login(config.botToken)
      .then(() => {
        this.initChannel();

        console.log(
          `Logged in to Discord as user ${this.client.user?.username}!`
        );
      })
      .catch((error) => {
        console.error("Failed to login to Discord:", error);
        throw error;
      });
  }

  private async initChannel(): Promise<void> {
    const config = AppConfig.getInstance().getConfig().discord;
    this.client.channels.fetch(config.channelId).then((channel) => {
      if (!channel) {
        throw new Error("Error: Discord channel not found.");
      }

      if (!channel.isTextBased()) {
        throw new Error(
          "Error: Specified Discord channel is not a text channel."
        );
      }

      const textChannel = channel as TextChannel;

      // Check if bot has permission to send messages in the channel
      if (!textChannel.permissionsFor(this.client.user!)?.has("SendMessages")) {
        throw new Error(
          "Error: Bot does not have permission to send messages in the specified channel."
        );
      }

      this.textChannel = textChannel;
    });
  }

  public static async sendMessage(
    username: string,
    message: string
  ): Promise<void> {
    const discord = await DiscordClient.getInstance();
    const emojiId = AppConfig.getInstance().getConfig().discord.emojiId;
    const emojiName = AppConfig.getInstance().getConfig().discord.emojiName;

    const textChannel = discord.getTextChannel();
    const emojiString =
      emojiId && emojiName ? `<:${emojiName}:${emojiId}> ` : "";

    textChannel!.send(`${emojiString}**${username}**: ${message}`);
  }

  private selectMessageStrategy(config: DiscordConfig): void {
    // Select the appropriate message strategy based on the config
    if (config.useWebhook) {
      if (!config.webhookId || !config.webhookToken) {
        throw new Error(
          "Webhook ID and token must be provided in the config file to use the Webhook strategy."
        );
      }
      this.messageStrategy = DiscordMessageStrategy.Webhook;
      console.log("Using Webhook message strategy.");
    } else if (config.emojiId && config.emojiName) {
      this.messageStrategy = DiscordMessageStrategy.Emoji;
      console.log("Using Emoji message strategy.");
    } else {
      this.messageStrategy = DiscordMessageStrategy.Regular;
      console.log("Using Regular message strategy.");
    }
  }

  public getMessageStrategy(): DiscordMessageStrategy {
    return this.messageStrategy;
  }

  public getTextChannel(): TextChannel | null {
    return this.textChannel;
  }
}
