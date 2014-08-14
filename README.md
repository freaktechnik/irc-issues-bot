irc-issues-bot
==============

A node based irc bot that links to issues when they are mentioned. Currently it connot be invoked with a given client or similar.

Dependencies
------------
  * https://github.com/fent/irc-colors.js
  * https://github.com/martynsmith/node-irc
  * https://github.com/mikedeboer/node-github

Bot Usage
---------
You can /invite the bot to additional, not hardcoded channels, though the bot will not autorejoin those in case it's restarted.

IssuesBot
---------
issuesbot.js exports the IssuesBot object, which requires an irc.Client plus a repo spec in the form of "owner/repo" as arguments.
