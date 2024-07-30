import { ApiClient } from "@twurple/api";
import { ChatClient } from "@twurple/chat";

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
  useWebhook: boolean | null;
  webhookId: string | null;
  webhookToken: string | null;
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

export interface TwitchClients {
  authenticatedChatClient: ChatClient | null;
  unauthenticatedChatClient: ChatClient | null;
  apiClient: ApiClient | null;
  botClientId: string | null;
}

export interface TwitchUser {
  username: string;
  displayName: string;
  profilePictureUrl: string;
}

export enum DiscordMessageStrategy {
  Webhook,
  Emoji,
  Regular,
}

export interface TwitchMessage {
  id: string;
  channelId: string;
  user: string;
  text: string;
}

export interface DiscordMessage {
  id: string;
  channelId: string;
  userId: string;
  text: string;
}

export interface LinkedMessage {
  discordMessageId?: string;
  twitchMessageId?: string;
}
