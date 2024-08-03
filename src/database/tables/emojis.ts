import Database from "better-sqlite3";
import { Emoji } from "../../types.js";

const db = new Database("database.db");

export const cachedEmojis = new Map<string, string>();

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

const emojis = {
  insertEmoji,
  getEmojiByName,
  updateCachedEmojis,
  checkIfEmojiIsCached,
};

export default emojis;
