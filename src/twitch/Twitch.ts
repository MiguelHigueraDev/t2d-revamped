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

const MAX_MESSAGES = 100;

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
  private messages: TwitchMessage[] = [];

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

  private async init(): Promise<void> {
    const config = AppConfig.getInstance().getConfig().twitch;

    // Create the authenticated chat client
    this.clients.authenticatedChatClient = new ChatClient({
      authProvider: await this.getTwitchAuthProvider(),
      channels: config.channels,
    });

    // Create the unauthenticated chat client
    this.clients.unauthenticatedChatClient = new ChatClient({
      authProvider: undefined,
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

    return authProvider;
  }

  public cacheMessage(message: TwitchMessage): void {
    this.messages.push(message);
    if (this.messages.length > MAX_MESSAGES) {
      this.messages.shift();
    }
  }

  public deleteMessage(messageId: string): void {
    this.messages.filter((message) => message.id !== messageId);
  }

  public getUser(username: string): TwitchUser | null {
    return this.users.get(username) || null;
  }

  public cacheUser(user: TwitchUser): void {
    this.users.set(user.username, user);
  }
}
