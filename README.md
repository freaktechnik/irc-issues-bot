irc-issues-bot
==============

A node based irc bot that links to issues when they are mentioned. Only supports linking to issues of one repo. It describes itself when PM'd.

Dependencies
------------
  * https://github.com/fent/irc-colors.js
  * https://github.com/martynsmith/node-irc
  * https://github.com/mikedeboer/node-github

Bot Usage
---------
You can /invite the bot to additional, not hardcoded channels, though the bot will not autorejoin those in case it's restarted.

To make the bot show info to an issue, just mention the issue number preceded by a # sign in a message.

IssuesBot
---------
issuesbot.js exports the IssuesBot object, which requires an irc.Client plus a repo spec in the form of "owner/repo" as arguments.
