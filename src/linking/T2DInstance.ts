import { DiscordInstance } from "../discord/DiscordInstance.js";
import { WebhookInstance } from "../discord/WebhookInstance.js";
import { InstanceConfig } from "../InstanceConfig.js";
import { TwitchInstance } from "../twitch/TwitchInstance.js";
import { LinkedMessage } from "../types.js";

export class T2DInstance {
  private config: InstanceConfig;
  private discordInstance: DiscordInstance;
  private twitchInstance: TwitchInstance;
  private webhookInstance: WebhookInstance;
  private linkedMessages: LinkedMessage[];

  public constructor(config: InstanceConfig) {
    this.config = config;
    this.discordInstance = new DiscordInstance(config);
    this.twitchInstance = new TwitchInstance(config);
    this.webhookInstance = new WebhookInstance(config);
    this.linkedMessages = [];
  }

  public async init(): Promise<void> {
    await this.discordInstance.initClient();
    await this.twitchInstance.initClients();
  }

  public getInstanceConfig(): InstanceConfig {
    return this.config;
  }

  public getDiscordInstance(): DiscordInstance {
    return this.discordInstance;
  }

  public getTwitchInstance(): TwitchInstance {
    return this.twitchInstance;
  }

  public getWebhookInstance(): WebhookInstance {
    return this.webhookInstance;
  }

  public getLinkedMessages(): LinkedMessage[] {
    return this.linkedMessages;
  }

  public cacheDiscordPart(messageId: string): void {
    if (!this.linkedMessages.find((m) => m.discordMessageId === messageId)) {
      this.linkedMessages.push({ discordMessageId: messageId });
    }
  }

  public cacheTwitchPart(messageId: string): void {
    if (!this.linkedMessages.find((m) => m.twitchMessageId === messageId)) {
      this.linkedMessages.push({ twitchMessageId: messageId });
    }
  }

  public linkDiscordToTwitch(
    discordMessageId: string,
    twitchMessageId: string
  ): void {
    const twitchMessage = this.linkedMessages.find(
      (m) => m.twitchMessageId === twitchMessageId
    );
    if (twitchMessage) {
      twitchMessage.discordMessageId = discordMessageId;
    }
  }

  public linkTwitchToDiscord(
    twitchMessageId: string,
    discordMessageId: string
  ): void {
    const twitchMessage = this.linkedMessages.find(
      (m) => m.twitchMessageId === twitchMessageId
    );
    if (twitchMessage) {
      twitchMessage.discordMessageId = discordMessageId;
    }
  }

  public getLinkedTwitchMessage(discordMessageId: string): string | undefined {
    const linkedMessage = this.linkedMessages.find(
      (m) => m.discordMessageId === discordMessageId
    );
    return linkedMessage?.twitchMessageId;
  }

  public getLinkedDiscordMessage(twitchMessageId: string): string | undefined {
    const linkedMessage = this.linkedMessages.find(
      (m) => m.twitchMessageId === twitchMessageId
    );
    return linkedMessage?.discordMessageId;
  }

  public deleteLinkedMessageDiscordId(discordMessageId: string): void {
    this.linkedMessages = this.linkedMessages.filter(
      (m) => m.discordMessageId !== discordMessageId
    );
  }

  public deleteLinkedMessageTwitchId(twitchMessageId: string): void {
    this.linkedMessages = this.linkedMessages.filter(
      (m) => m.twitchMessageId !== twitchMessageId
    );
  }
}
