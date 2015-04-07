#! /usr/bin/env node

//TODO check validity of command args
//TODO save ignores

var Client = require("irc").Client;
var IssuesBot = require("./issuesbot").IssuesBot;
var QuipsBot = require("./quipsbot").QuipsBot;
var storage = require("node-persist");

storage.initSync();

if(!storage.getItem("chans")) {
    storage.setItem("chans", []);
}

if(!storage.getItem("quipsbots")) {
    storage.setItem("quipsbots", []);
}

if(!storage.getItem("gitbots")) {
    storage.setItem("gitbots", []);
}

// IRC config
var client = new Client("irc.mozilla.org",
                "robotechnik",
                {
                    "channels": storage.getItem("chans"),
                    "floodProtection": true
                }
            );


var bots = {"git": {}, "quips": {}};

storage.getItem("quipsbots").forEach(function(bot) {
    startBot("quips", bot.channel);
});

storage.getItem("gitbots").forEach(function(bot) {
    startBot("git", bot.channel, bot.options);
});

setInterval(function(){client.send('PONG', 'empty');}, 5*60*1000);

function joinChannelIfNeeded(channel) {
    var channels = storage.getItem("chans");
    if(channels.indexOf(channel) == -1) {
        channels.push(channel);
        storage.setItem("chans", channels);
        client.join(channel);
    }
}

function leaveChannel(channel) {
    var channels = storage.getItem("chans");
    channels.splice(channels.indexOf(channel), 1);
    storage.setItem("chans", channels || []);
    client.part(channel, "My master needs me in other places!");
    removeBots(channel);
}

client.addListener("invite", function(channel) {
	joinChannelIfNeeded(channel);
});

function startBot(type, channel, options) {
    var bot;
    joinChannelIfNeeded(channel);
    if(type == "quips") {
        bot = new QuipsBot(client, channel);
    }
    else if(type == "git") {
        bot = new IssuesBot(client, channel, options);
    }
    bots[type][channel] = bot;
}

function addBot(type, channel, options) {
    startBot(type, channel, options);

    var persistBots = storage.getItem(type+"bots");
    persistBots.push({channel: channel, options: options});
    storage.setItem(type+"bots", persistBots);
}

function removeBots(channel) {
    //TODO
}

client.addListener("pm", function(from, message) {
    //TODO make admin list dynamic
    if(message.charAt(0) == "!" && from == "freaktechnik") {
        var cmd = message.split(" ");
        if(cmd[0] == "!leave") {
            leaveChannel(cmd[2]);
        }
        else if(cmd[0] == "!join") {
            joinChannelIfNeeded(cmd[1]);
        }
        else if(cmd[0] == "!git") {
            addBot("git", cmd[1], cmd[2]);
        }
        else if(cmd[0] == "!quips") {
            addBot("quips", cmd[1]);
        }
        else if(cmd[0] == "!ignore") {
            bots["git"][cmd[1]].blackList.push(cmd[2]);
        }
        else {
            client.say(from, "Command not found");
        }
    }
    else {
	    client.say(from, "I am a Node.js based GitHub Issues bot that displays informations to mentioned issues. To trigger me, just reference the issue with #[Issuenumber]. If you want to add me to a channel, use /invite. You can find my source on https://github.com/freaktechnik/irc-issues-bot.");
    }
});

//var bot = new IssuesBot(client, "nightingale-media-player/nightingale-hacking", "#nightingale");
//bot.blackList.push("travis-ci");

//var quips = new QuipsBot(client);
