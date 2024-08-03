import Database from "better-sqlite3";
import fs from "fs";
import emojis from "./tables/emojis.js";

const db = new Database("database.db");

// Setup database only if it doesn't exist
const setupDatabase = (): void => {
  if (!fs.existsSync("database.db")) {
    db.prepare(
      "CREATE TABLE IF NOT EXISTS emojis (twitchId TEXT PRIMARY KEY, emojiName TEXT, emojiId TEXT)"
    ).run();
  }
};

const database = {
  setupDatabase,
  emojis,
};

export default database;
