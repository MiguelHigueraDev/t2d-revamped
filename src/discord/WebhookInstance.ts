import { WebhookClient } from "discord.js";
import { InstanceConfig } from "../InstanceConfig.js";

export class WebhookInstance {
  private config: InstanceConfig;
  private client: WebhookClient;

  public constructor(config: InstanceConfig) {
    this.config = config;

    if (!this.config.getConfig().discord.useWebhook) {
      throw new Error("Webhook was not enabled in the config file.");
    }

    if (!this.config.getConfig().discord.webhookId) {
      throw new Error("Webhook ID was not provided in the config file.");
    }

    if (!this.config.getConfig().discord.webhookToken) {
      throw new Error("Webhook token was not provided in the config file.");
    }

    this.client = new WebhookClient({
      id: this.config.getConfig().discord.webhookId!,
      token: this.config.getConfig().discord.webhookToken!,
    });
  }

  /**
   * Sends a chat message to Discord as a webhook.
   * @param username The username of the user who sent the message.
   * @param message The message text.
   * @param avatarUrl The URL of the user's avatar.
   */
  public async sendMessage(
    username: string,
    message: string,
    avatarUrl?: string
  ): Promise<void> {
    const webhookClient = this.client;
    if (webhookClient) {
      await webhookClient
        .send({
          content: message,
          username: username,
          avatarURL: avatarUrl,
        })
        .catch(() => {});
    }
  }

  public async deleteMessage(messageId: string): Promise<void> {
    const webhookClient = this.client;
    if (webhookClient) {
      await webhookClient.deleteMessage(messageId).catch(() => {});
    }
  }
}
