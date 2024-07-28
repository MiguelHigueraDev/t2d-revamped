import { authenticateTwitch } from "./twitch/twitchOauthServer.js";
import { AppConfig } from "./AppConfig.js";
import { Twitch } from "./twitch/Twitch.js";
import { registerTwitchMessageHandler } from "./twitch/messageHandling.js";
import { DiscordClient } from "./discord/DiscordClient.js";
import { Webhook } from "./discord/Webhook.js";
import { registerDiscordMessageHandler } from "./discord/messageHandling.js";

const CONFIG_FILE_PATH = "./config.json";
export const TOKEN_DATA_PATH = "./tokens.json";

const startApp = async () => {
  try {
    // Load the config file when the app starts
    const appConfig = AppConfig.getInstance();
    await appConfig.loadConfig(CONFIG_FILE_PATH);

    const config = appConfig.getConfig();

    // Get the Twitch auth token
    await authenticateTwitch(config.twitch, config.https);

    // Init Twitch
    const twitch = await Twitch.getInstance();

    // Register the Twitch message handler
    await registerTwitchMessageHandler();

    // Init Discord
    const discord = await DiscordClient.getInstance();

    // Init webhook
    const webhook = Webhook.getInstance();

    // Register the Discord message handler
    await registerDiscordMessageHandler();
  } catch (error) {
    console.error("Failed to start the app due to config error:", error);
  }
};

startApp();
