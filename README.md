irc-issues-bot
==============

A node based irc bot that links to issues when they are mentioned. Only supports linking to issues of one repo. It describes itself when PM'd.

Dependencies
------------
  * https://github.com/fent/irc-colors.js
  * https://github.com/martynsmith/node-irc
  * https://github.com/mikedeboer/node-github
  * https://github.com/lmaccherone/node-localstorage

To install them, just run `npm install` in the root directory of the repository.

Bot Usage
---------
Start the bot using `node main.js server username ownername`. You don't have to
set owenername, but without it, you'll have a hard time controlling the bot.
The arguments can alternatively be specified in the env vars `IRCBOT_SERVER`,
`IRCBOT_USERNAME` and `IRCBOT_OWNER`.

Set the `REDIS_URL` environment variable to use redis instead of plain text files
for config storage.

You can /invite the bot to channels.

The owner and channel mods can adjust the channel settings. Check !help in a
private message to the bot for more info.

IssuesBot
---------
issuesbot.js exports the IssuesBot object, which requires an irc.Client plus a repo spec in the form of "owner/repo" as arguments.
