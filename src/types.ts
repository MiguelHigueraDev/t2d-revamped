export interface Config {
  discord: DiscordConfig;
  twitch: TwitchConfig;
  webserver: WebserverConfig;
}

export interface DiscordConfig {
  channelId: string;
  botToken: string;
  charLimit: number | null;
  emojiName: string | null;
  emojiId: string | null;
}

export interface TwitchConfig {
  username: string;
  channels: string[];
  clientId: string;
  clientSecret: string;
  scope: string;
  redirectUri: string;
}

export interface WebserverConfig {
  useHttps: boolean;
  authPagePath: string;
}
