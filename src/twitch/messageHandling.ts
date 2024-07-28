import { ChatMessage } from "@twurple/chat";
import { Twitch } from "./Twitch.js";
import { TwitchMessage, TwitchUser } from "../types.js";

export const registerTwitchMessageHandler = async () => {
  const twitch = await Twitch.getInstance();

  twitch.clients.unauthenticatedChatClient?.onMessage(
    async (channel: string, user: string, text: string, msg: ChatMessage) => {
      // Cache message
      const message: TwitchMessage = {
        id: msg.id,
        channel,
        user,
        text,
      };
      twitch.cacheMessage(message);

      // Cache user
      const userIsCached = twitch.getUser(user);
      if (!userIsCached) {
        await twitch.clients.apiClient?.users
          .getUserByName(user)
          .then((foundUser) => {
            if (foundUser) {
              const user: TwitchUser = {
                username: foundUser.name,
                displayName: foundUser.displayName,
                profilePictureUrl: foundUser.profilePictureUrl,
              };
              twitch.cacheUser(user);
            }
          })
          .catch((error) => {
            console.error(`Error getting user: ${error}`);
          });
      }
    }
  );
};
