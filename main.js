#! /usr/bin/env node

var irc = require("irc");

var channel = "#nightingale";

// IRC config
var client = new irc.Client("irc.mozilla.org",
                "ngissuesbot",
                {
                    "channels": [ channel ],
                    "floodProtection": true
                }
            );

require("./issuesbot").IssuesBot(client, "nightingale-media-player/nightingale-hacking");
