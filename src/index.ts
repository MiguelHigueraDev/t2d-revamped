import { authenticateTwitch } from "./twitch/twitchOauthServer.js";
import { InstanceConfig } from "./InstanceConfig.js";
import { registerTwitchMessageHandler } from "./twitch/messageHandling.js";
import { DiscordInstance } from "./discord/DiscordInstance.js";
import { WebhookInstance } from "./discord/WebhookInstance.js";
import { registerDiscordMessageHandlers } from "./discord/messageHandling.js";
import database from "./database/database.js";
import { T2DInstance } from "./linking/T2DInstance.js";

const CONFIG_FILE_PATH = "./config.json";
export const TOKEN_DATA_PATH = "./tokens.json";

const startApp = async () => {
  try {
    // Load the config file when the app starts
    const instanceConfig = new InstanceConfig();
    await instanceConfig.loadConfig(CONFIG_FILE_PATH);
    console.log("Loaded the config file.");

    // Get the Twitch auth token
    await authenticateTwitch(
      instanceConfig.getConfig().twitch,
      instanceConfig.getConfig().https
    );

    // Create a new T2D instance and initialize it
    const instance = new T2DInstance(instanceConfig);
    await instance.init();

    console.log("Initialized the T2D instance.");

    // Create discord instance and initialize it
    const twitchInstance = instance.getTwitchInstance();
    await twitchInstance.initClients();

    // Create discord instance and initialize it
    const discord = instance.getDiscordInstance();
    await discord.initClient();

    // Register the Discord message handlers
    await registerDiscordMessageHandlers(instance);

    // Register the Twitch message handler
    await registerTwitchMessageHandler(instance);

    // Init webhook
    const webhook = instance.getWebhookInstance();

    // Setup the database table(s)
    database.setupDatabase();

    // Update the cached emojis
    const cachedAmount = database.updateCachedEmojis();
    console.log(`Cached ${cachedAmount} emojis in memory.`);
  } catch (error) {
    console.error("Failed to start the app due to config error:", error);
    throw error;
  }
};

startApp();
