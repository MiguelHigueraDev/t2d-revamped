import { promises as fs } from "fs";
import { Config } from "./types";
import { z } from "zod";

const DiscordConfigSchema = z.object({
  channelId: z.string(),
  botToken: z.string(),
  charLimit: z.number().nullable(),
  emojiName: z.string().nullable(),
  emojiId: z.string().nullable(),
});

const TwitchConfigSchema = z.object({
  username: z.string(),
  channels: z.array(z.string()),
  clientId: z.string(),
  clientSecret: z.string(),
  scope: z.string(),
  redirectUri: z.string(),
});

const WebserverConfigSchema = z.object({
  useHttps: z.boolean(),
  authPagePath: z.string(),
});

const ConfigSchema = z.object({
  discord: DiscordConfigSchema,
  twitch: TwitchConfigSchema,
  webserver: WebserverConfigSchema,
});

export class AppConfig {
  private static instance: AppConfig;
  private config: Config | null = null;

  private constructor() {}

  public static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  public async loadConfig(configPath: string): Promise<void> {
    if (this.config === null) {
      try {
        const data = await fs.readFile(configPath, "utf-8");
        const jsonData: Config = JSON.parse(data);
        this.config = ConfigSchema.parse(jsonData);
      } catch (error) {
        console.error(`Error parsing config file: ${error}`);
        throw error;
      }
    }
  }

  public getConfig(): Config {
    if (this.config === null) {
      throw new Error("Config has not been loaded yet.");
    }
    return this.config;
  }
}
