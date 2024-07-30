import {
  AuthProvider,
  getTokenInfo,
  RefreshingAuthProvider,
} from "@twurple/auth";
import { AppConfig } from "../AppConfig.js";
import { promises as fs } from "fs";
import { TwitchClients, TwitchMessage, TwitchUser } from "../types.js";
import { ChatClient } from "@twurple/chat";
import { ApiClient } from "@twurple/api";
import { TOKEN_DATA_PATH } from "../index.js";
import { MAX_CACHED_MESSAGES } from "../constants.js";

const MAX_TWITCH_MESSAGE_LENGTH = 500;

export class Twitch {
  private static instance: Twitch;
  private static initialized = false;
  private authProvider: AuthProvider | null = null;
  public clients: TwitchClients = {
    authenticatedChatClient: null,
    unauthenticatedChatClient: null,
    apiClient: null,
    botClientId: null,
  };

  // Cache the last 100 messages
  private cachedMessages: TwitchMessage[] = [];

  // Cache users to avoid unnecessary API calls
  private users: Map<string, TwitchUser> = new Map();

  private constructor() {}

  public static async getInstance(): Promise<Twitch> {
    if (!Twitch.instance) {
      Twitch.instance = new Twitch();
      // Initialize the Twitch instance
      if (!Twitch.initialized) {
        await Twitch.instance.init();
        Twitch.instance.connect();
        Twitch.initialized = true;
      }
    }
    return Twitch.instance;
  }

  /**
   * Sends a message to the Twitch chat.
   * @param username - The username of the sender.
   * @param message - The message to be sent.
   */
  public async sendMessage(username: string, message: string): Promise<void> {
    const channelId = AppConfig.getInstance().getConfig().twitch.channels[0];
    await this.clients.authenticatedChatClient?.say(
      channelId,
      `[D] ${username}: ${message}`.substring(0, MAX_TWITCH_MESSAGE_LENGTH - 1)
    );
  }

  /**
   * Deletes a chat message with the specified message ID.
   * @param message The message to delete.
   * @returns A Promise that resolves when the message is successfully deleted.
   */
  public async deleteMessage(message: TwitchMessage): Promise<void> {
    try {
      await this.clients.apiClient?.asUser(
        this.clients.botClientId!,
        async (apiClient) => {
          await apiClient.moderation.deleteChatMessages(
            message.channelId,
            message.id
          );
        }
      );
    } catch (error) {
      console.error(
        `Failed to delete message with ID ${message.id}: \n${error}`
      );
    }
  }

  /**
   * Caches a Twitch message.
   * @param message The Twitch message to be cached.
   */
  public cacheMessage(message: TwitchMessage): void {
    this.cachedMessages.push(message);
    if (this.cachedMessages.length > MAX_CACHED_MESSAGES) {
      this.cachedMessages.shift();
    }
  }

  public getCachedMessages(): TwitchMessage[] {
    return this.cachedMessages;
  }

  public getCachedMessage(messageId: string): TwitchMessage | null {
    return (
      this.cachedMessages.find((message) => message.id === messageId) || null
    );
  }

  public deleteCachedMessage(messageId: string): void {
    this.cachedMessages.filter((message) => message.id !== messageId);
  }

  public getUser(username: string): TwitchUser | null {
    return this.users.get(username) || null;
  }

  public cacheUser(user: TwitchUser): void {
    this.users.set(user.username, user);
  }

  private async init(): Promise<void> {
    const config = AppConfig.getInstance().getConfig().twitch;

    // Create the authenticated chat client
    this.clients.authenticatedChatClient = new ChatClient({
      authProvider: await this.getTwitchAuthProvider(),
      channels: [config.channels[0]],
    });

    // Create the unauthenticated chat client
    this.clients.unauthenticatedChatClient = new ChatClient({
      channels: [config.channels[0]],
    });

    // Create the API client
    this.clients.apiClient = new ApiClient({
      authProvider: await this.getTwitchAuthProvider(),
    });
  }

  private connect() {
    this.clients.authenticatedChatClient?.connect();
    this.clients.unauthenticatedChatClient?.connect();
  }

  private async getTwitchAuthProvider(): Promise<AuthProvider> {
    if (this.authProvider) {
      return this.authProvider;
    }

    const twitchConfig = AppConfig.getInstance().getConfig().twitch;

    let tokenData;
    try {
      tokenData = JSON.parse(await fs.readFile(TOKEN_DATA_PATH, "utf-8"));
      console.log("Using saved token data found in tokens.json");
    } catch (error) {
      console.error(`Error reading token data: ${error}`);
      throw error;
    }

    const authProvider = new RefreshingAuthProvider({
      clientId: twitchConfig.clientId,
      clientSecret: twitchConfig.clientSecret,
    });

    // Automatically refresh the token when it expires
    authProvider.onRefresh(async (newTokenData) => {
      await fs.writeFile(
        TOKEN_DATA_PATH,
        JSON.stringify(newTokenData, null, 4),
        "utf-8"
      );
    });

    this.clients.botClientId = (
      await getTokenInfo(
        tokenData.accessToken,
        AppConfig.getInstance().getConfig().twitch.clientId
      )
    ).userId;
    authProvider.addUser(this.clients.botClientId!, tokenData as never, [
      "chat",
    ]);

    this.authProvider = authProvider;

    return authProvider;
  }
}
