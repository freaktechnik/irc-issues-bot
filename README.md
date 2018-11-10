irc-issues-bot
==============

[![Build Status](https://travis-ci.org/freaktechnik/irc-issues-bot.svg?branch=master)](https://travis-ci.org/freaktechnik/irc-issues-bot) [![Greenkeeper badge](https://badges.greenkeeper.io/freaktechnik/irc-issues-bot.svg)](https://greenkeeper.io/) [![Dependency Status](https://dependencyci.com/github/freaktechnik/irc-issues-bot/badge)](https://dependencyci.com/github/freaktechnik/irc-issues-bot) [![codecov](https://codecov.io/gh/freaktechnik/irc-issues-bot/branch/master/graph/badge.svg)](https://codecov.io/gh/freaktechnik/irc-issues-bot)

A node based IRC bot that links to issues when they are mentioned. It describes itself when PMd.

Installation
------------

Just run `npm i` in the root directory of the repository.

Bot Usage
---------
Start the bot using `node main.js server username [ownername] [password]`. You don't have to
set owenername, but without it, you'll have a hard time controlling the bot.
The arguments can alternatively be specified in these env vars:
- `IRCBOT_SERVER`: IRC server address
- `IRCBOT_USERNAME`: Username of the bot
- `IRCBOT_OWNER`: User with unquestioned control over the bot
- `IRCBOT_PASSWORD`: NickServ password
- `IRCBOT_PORT`: To connect to an alternate port other than 6697
- `IRCBOT_NOTSECURE`: Don't connect via secure connection

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
