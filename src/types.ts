export interface Config {
  discord: DiscordConfig;
  twitch: TwitchConfig;
  https: HttpsConfig;
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
  scopes: string;
  redirectUri: string;
}

export interface HttpsConfig {
  useHttps: boolean | null;
  authPagePath: string | null;
  certPath: string | null;
  keyPath: string | null;
  passphrase: string | null;
}
