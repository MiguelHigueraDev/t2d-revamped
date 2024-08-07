import database from "../database/databaseSetup.js";
import { DiscordInstance } from "../discord/DiscordInstance.js";
import { EmojiUploadResponse } from "../types.js";

export const createDiscordEmoji = async (
  discordInstance: DiscordInstance,
  emoteId: string,
  emoteName: string
): Promise<void> => {
  // Get emote URL
  const emoteUrl = getEmoteUrl(emoteId);
  const base64Image = await getEmoteBase64(emoteUrl);
  // Get application ID (required to upload emoji)
  const applicationId = discordInstance.getClient().application?.id;
  if (!applicationId) {
    console.error("Application ID not found");
    return;
  }
  // Upload emoji
  try {
    const { id: emojiId, name: emojiName } = await uploadEmoji(
      discordInstance,
      base64Image,
      emoteName
    );

    // Store emoji ID and name in database, and cache the emojis
    database.emojis.insertEmoji(emoteId, emojiId, emojiName);
    database.emojis.updateCachedEmojis();
  } catch (error) {
    console.error(`Failed to upload emoji: ${error}`);
  }
};

const getEmoteUrl = (emoteId: string): string => {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/static/light/3.0`;
};

const getEmoteBase64 = async (emoteUrl: string): Promise<string> => {
  const response = await fetch(emoteUrl);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/png;base64,${base64}`;
};

const uploadEmoji = async (
  discordInstance: DiscordInstance,
  base64Image: string,
  name: string
): Promise<EmojiUploadResponse> => {
  const applicationId = discordInstance.getClient().application?.id;
  const apiUrl = `https://discord.com/api/v10/applications/${applicationId}/emojis`;
  const response = await fetch(apiUrl, {
    method: "POST",
    body: JSON.stringify({
      name,
      image: base64Image,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${discordInstance.getClient().token}`,
    },
  });

  if (!response.ok) {
    console.error(`Failed to upload emoji: ${response.statusText}`);
    throw new Error("Failed to upload emoji");
  }

  const data: EmojiUploadResponse = await response.json();
  return data;
};
