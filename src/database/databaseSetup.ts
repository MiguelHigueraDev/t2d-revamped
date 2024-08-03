import Database from "better-sqlite3";
import fs from "fs";
import { Emoji } from "../types.js";

const db = new Database("database.db");

// Setup database only if it doesn't exist
const setupDatabase = (): void => {
  if (!fs.existsSync("database.db")) {
    db.prepare(
      "CREATE TABLE IF NOT EXISTS emojis (twitchId TEXT PRIMARY KEY, emojiName TEXT, emojiId TEXT)"
    ).run();
  }
};

const insertEmoji = (
  twitchId: string,
  emojiId: string,
  emojiName: string
): void => {
  db.prepare(
    "INSERT INTO emojis (twitchId, emojiId, emojiName) VALUES (?, ?, ?)"
  ).run(twitchId, emojiId, emojiName);
};

const getEmojiByName = (emojiName: string): Emoji => {
  return db
    .prepare("SELECT * FROM emojis WHERE emojiName = ?")
    .get(emojiName) as Emoji;
};

const updateCachedEmojis = (): number => {
  const rows: Emoji[] = db.prepare("SELECT * FROM emojis").all() as Emoji[];
  rows.forEach((row) => {
    cachedEmojis.set(row.emojiName, row.emojiId);
  });
  return rows.length;
};

const checkIfEmojiIsCached = (emojiName: string): boolean => {
  return cachedEmojis.has(emojiName);
};

export const cachedEmojis = new Map<string, string>();

const database = {
  setupDatabase,
  insertEmoji,
  getEmojiByName,
  updateCachedEmojis,
  checkIfEmojiIsCached,
};

export default database;
