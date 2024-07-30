# t2d-revamped

Utility to link Twitch chat with a Discord channel.
Messages sent in Twitch chat will be sent to Discord and vice versa.

### Features:

- Webhook support: Optional, can use webhooks so messages are displayed as they were sent by a regular Discord account, with the sender's username and profile picture.
- Custom emoji: If not using webhooks, can select an emoji to be prepended to every message relayed to Discord.
- Synced deletions: If a message is deleted on Twitch, it will be deleted in Discord and vice versa.
- More to come

### How to set up:

**WIP**

### Credits:

This application was inspired by [twitchToDiscordBot](https://github.com/iSlammedMyKindle/twitchToDiscordBot) so I have to thank iSlammedMyKindle for many of the ideas. This is just a way for me to improve on the original project by adding new features. Instead of just forking the project, I decided to start from scratch to learn more things.

The OAuth server implementation used in this software was heavily based on [his OAuth implementation](https://github.com/iSlammedMyKindle/kindle-twitch-oauth) (not just an inspiration).
