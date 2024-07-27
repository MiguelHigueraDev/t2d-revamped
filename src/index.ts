import { AppConfig } from "./configParsing";

const CONFIG_FILE_PATH = "./config.json";

const startApp = async () => {
  try {
    // Load the config file when the app starts
    const appConfig = AppConfig.getInstance();
    await appConfig.loadConfig(CONFIG_FILE_PATH);
  } catch (error) {
    console.error("Failed to start the app due to config error:", error);
  }
};

startApp();
