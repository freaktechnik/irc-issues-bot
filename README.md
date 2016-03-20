irc-issues-bot
==============

A node based irc bot that links to issues when they are mentioned. It describes itself when PM'd.

Dependencies
------------
  * https://github.com/fent/irc-colors.js
  * https://github.com/martynsmith/node-irc
  * https://github.com/mikedeboer/node-github
  * https://github.com/lmaccherone/node-localstorage

To install them, just run `npm install` in the root directory of the repository.

Bot Usage
---------
Start the bot using `node main.js server username [ownername] [password]`. You don't have to
set owenername, but without it, you'll have a hard time controlling the bot.
The arguments can alternatively be specified in the env vars `IRCBOT_SERVER`,
`IRCBOT_USERNAME` and `IRCBOT_OWNER` as well as `IRCBOT_PASSWORD` for a NickServ password.

Set the `REDIS_URL` environment variable to use redis instead of plain text files
for config storage.

You can `/invite` the bot to channels.

The owner and channel mods can adjust the channel settings. Check !help in a
private message to the bot for more info.

Issue Number Patterns
---------------
The bot recognizes the following issues patterns (if the issues bot is activated for a channel):

 - `#5`: Issue #5 for the configured repository
 - `freaktechnik/irc-issues-bot#5`: Issue #5 for [freaktechnik/irc-issues-bot](https://github.com/freaktechnik/irc-issues-bot)
 - `https://github.com/freaktechnik/irc-issues-bot/issues/5`: Issue #5 for [freaktechnik/irc-issues-bot](https://github.com/freaktechnik/irc-issues-bot)

IssuesBot
---------
issuesbot.js exports the IssuesBot object, which requires an irc.Client plus a repo spec in the form of "owner/repo" as arguments.
