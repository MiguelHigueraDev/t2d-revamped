/**
 * This file contains the logic for parsing the config file.
 * The config file is a JSON file that contains the configuration for the app.
 * The config file is validated against a JSON schema using the `zod` library.
 * The `AppConfig` class is a singleton class that loads the config file and provides global access to the config data.
 */

import { promises as fs } from "fs";
import { Config } from "./types.js";
import { z } from "zod";

const DiscordConfigSchema = z.object({
  channelId: z.string(),
  botToken: z.string(),
  charLimit: z.number().nullable(),
  emojiName: z.string().nullable(),
  emojiId: z.string().nullable(),
  useWebhook: z.boolean().nullable(),
  webhookId: z.string().nullable(),
  webhookToken: z.string().nullable(),
});

const TwitchConfigSchema = z.object({
  username: z.string(),
  channels: z.array(z.string()),
  clientId: z.string(),
  clientSecret: z.string(),
  scopes: z.string(),
  redirectUri: z.string(),
});

const HttpsConfigSchema = z.object({
  useHttps: z.boolean().nullable(),
  authPagePath: z.string().nullable(),
  certPath: z.string().nullable(),
  keyPath: z.string().nullable(),
  passphrase: z.string().nullable(),
});

const ConfigSchema = z.object({
  discord: DiscordConfigSchema,
  twitch: TwitchConfigSchema,
  https: HttpsConfigSchema,
});

/**
 * Represents the instance's configuration.
 */
export class InstanceConfig {
  private config: Config | null = null;

  public constructor() {}

  /**
   * Loads the configuration from the specified file path.
   * @param configPath - The path to the configuration file.
   * @returns A promise that resolves when the configuration is loaded.
   * @throws If there is an error parsing the config file.
   */
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

  /**
   * Returns the loaded configuration.
   * @returns The loaded configuration.
   * @throws If the configuration has not been loaded yet.
   */
  public getConfig(): Config {
    if (this.config === null) {
      throw new Error("Config has not been loaded yet.");
    }
    return this.config;
  }
}
