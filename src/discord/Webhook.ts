import { WebhookClient } from "discord.js";
import { AppConfig } from "../AppConfig.js";

export class Webhook {
  private static instance: WebhookClient;

  public static getInstance(): WebhookClient | null {
    const config = AppConfig.getInstance().getConfig().discord;
    if (!config.useWebhook) {
      return null;
    }

    if (!config.webhookId || !config.webhookToken) {
      throw new Error(
        "Webhook ID and token must be provided in the config file."
      );
    }

    if (!Webhook.instance) {
      Webhook.instance = new WebhookClient({
        id: config.webhookId,
        token: config.webhookToken,
      });
    }
    return Webhook.instance;
  }

  /**
   * Sends a chat message to Discord as a webhook.
   * @param username The username of the user who sent the message.
   * @param message The message text.
   * @param avatarUrl The URL of the user's avatar.
   */
  public static async sendMessage(
    username: string,
    message: string,
    avatarUrl?: string
  ): Promise<void> {
    const webhook = Webhook.getInstance();
    if (webhook) {
      await webhook
        .send({
          content: message,
          username: username,
          avatarURL: avatarUrl,
        })
        .catch(() => {});
    }
  }

  public static async deleteMessage(messageId: string): Promise<void> {
    const webhook = Webhook.getInstance();
    if (webhook) {
      await webhook.deleteMessage(messageId).catch(() => {});
    }
  }
}
