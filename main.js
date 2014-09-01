#! /usr/bin/env node

var Client = require("irc").Client;
var IssuesBot = require("./issuesbot").IssuesBot;
var QuipsBot = require("./quipsbot").QuipsBot;

var channel = "#nightingale";

// IRC config
var client = new Client("irc.mozilla.org",
                "ngissuesbot",
                {
                    "channels": [ channel ],
                    "floodProtection": true
                }
            );

var bot = new IssuesBot(client, "nightingale-media-player/nightingale-hacking");
bot.blackList.push("travis-ci");

var quips = new QuipsBot(client);
