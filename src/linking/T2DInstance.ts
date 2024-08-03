import { DiscordInstance } from "../discord/DiscordInstance.js";
import { WebhookInstance } from "../discord/WebhookInstance.js";
import { InstanceConfig } from "../InstanceConfig.js";
import { TwitchInstance } from "../twitch/TwitchInstance.js";

export class T2DInstance {
  private config: InstanceConfig;
  private discordInstance: DiscordInstance;
  private twitchInstance: TwitchInstance;
  private webhookInstance: WebhookInstance;

  public constructor(config: InstanceConfig) {
    this.config = config;
    this.discordInstance = new DiscordInstance(config);
    this.twitchInstance = new TwitchInstance(config);
    this.webhookInstance = new WebhookInstance(config);
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
}
