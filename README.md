irc-issues-bot
==============

A node based irc bot that links to issues when they are mentioned. Only supports linking to issues of one repo. It describes itself when PM'd.

Dependencies
------------
  * https://github.com/fent/irc-colors.js
  * https://github.com/martynsmith/node-irc
  * https://github.com/mikedeboer/node-github
  * https://github.com/simonlast/node-persist

To install them, just run `npm install` in the root directory of the repository.

Bot Usage
---------
You can /invite the bot to channels.

The owner and channel mods can adjust the channel settings. Check !help in a
private message to the bot for more info.

IssuesBot
---------
issuesbot.js exports the IssuesBot object, which requires an irc.Client plus a repo spec in the form of "owner/repo" as arguments.
