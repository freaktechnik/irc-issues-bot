#! /usr/bin/env node

//TODO check validity of command args

var Client = require("irc").Client;
var IssuesBot = require("./issuesbot").IssuesBot;
var QuipsBot = require("./quipsbot").QuipsBot;
var storage = require("./storage");
var EventBot = require("./eventbot").EventBot;

var botTypes = ["quips", "git", "event"];

if(!storage.getItem("chans")) {
    storage.setItem("chans", []);
}

botTypes.forEach(function(type) {
    if(!storage.getItem(type+"bots")) {
        storage.setItem(type+"bots", []);
    }
});

var args = process.argv.slice(2);

if(args.length < 2 && !process.env.IRCBOT_SERVER) {
    throw new Error("No target defined");
}

// IRC config
var ircOptions = {
    "channels": storage.getItem("chans"),
    "floodProtection": true,
    "port": process.env.IRCBOT_PORT || 6697
};
if(!process.env.IRCBOT_NOTSECURE)
    ircOptions.secure = true;

var nick = args[1] || process.env.IRCBOT_USERNAME;
var client = new Client(args[0] || process.env.IRCBOT_SERVER,
    nick, ircOptions
);


var bots = {"git": {}, "quips": {}, "event": {}};
var owner = args[2] || process.env.IRCBOT_OWNER;

setInterval(function(){client.send('PONG', 'empty');}, 5*60*1000);

function typeExists(type) {
    return type && botTypes.indexOf(type) > -1;
}

function joinChannelIfNeeded(channel) {
    var channels = storage.getItem("chans") || [];
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
    removeBots(channel);
    client.part(channel, "My master needs me in other places!", function() {/*NULL*/});
}

client.addListener("invite", function(channel) {
	joinChannelIfNeeded(channel);
});
client.addListener("error", function(error) {
    console.error(error);
});
var password = args[3] || process.env.IRCBOT_PASSWORD;
function registerWithNickServ() {
    if(password) {
        client.say("NickServ", "IDENTIFY "+nick+" "+password);
        if(client.nick != nick) {
            client.say("NickServ", "RECOVER "+nick);
            client.send("NICK", nick);
            cliend.say("ChanServ", "UP");
        }
    }
    botTypes.forEach(function(type) {
        storage.getItem(type+"bots").forEach(function(bot) {
            startBot(type, bot.channel, bot.options);
        });
    });
}
client.addListener("registered", registerWithNickServ);
client.addListener("quit", function(username) {
    if(username == nick)
        registerWithNickServ();
});

function startBot(type, channel, options) {
    joinChannelIfNeeded(channel);
    var bot;
    if(type == "quips") {
        bot = new QuipsBot(client, channel);
    }
    else if(type == "git") {
        bot = new IssuesBot(client, channel, options);
    }
    else if(type == "event") {
        bot = new EventBot(client, channel, options);
    }
    bots[type][channel] = bot;
}

function addBot(type, channel, options) {
    if(typeExists(type)) {
        joinChannelIfNeeded(channel);

        var persistBots = storage.getItem(type+"bots");

        if(getBotIndex(type, channel) == -1) {
            persistBots.push({channel: channel, options: options});
            storage.setItem(type+"bots", persistBots);

            startBot(type, channel, options);
        }
    }
}

function getBotIndex(type, channel) {
    var index = -1, bots = storage.getItem(type+"bots");
    bots.some(function(bot, i) {
        if(bot.channel == channel) {
            index = i;
            return true;
        }
        return false;
    });
    return index;
}

function getBotForChannel(type, channel) {
    var index = getBotIndex(type, channel),
        bots = storage.getItem(type+"bots");
    return index > -1 ? bots[index] : null;
}

function isUserOp(channel, user) {
    var status = client.chans[channel].users[user];
    // owner, op, or halfop
    return status == "~" || status == "@" || status == "%";
}

function stopBot(type, channel) {
    if(typeExists(type)) {
        var bot = getBotIndex(type, channel);
        if(bot > -1) {
            var _bots = storage.getItem(type+"bots");
            _bots.splice(bot, 1);
            storage.setItem(type+"bots", _bots);
            if(channel in bots[type]) {
                bots[type][channel].stop();
                delete bots[type][channel];
            }
        }
    }
}

function removeBots(channel) {
    botTypes.forEach(function(type) {
        stopBot(type, channel);
    });
}

client.addListener("pm", function(from, message) {
    if(message.charAt(0) == "!") {
        var cmd = message.split(" ");
        if(cmd[0] == "!help") {
            client.say(from, "Supported commands: !leave #channel, !join #channel, !git #channel owner/repo, !quips #channel, !ignore #channel username, !list, !start #channel type args, !stop #channel type");
        }
        else if(cmd.length > 1 && cmd[1].charAt(0) == "#" &&
           ( from == owner || isUserOp(cmd[1], from) )) {
            if(cmd[0] == "!leave") {
                leaveChannel(cmd[1]);
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
                bots["git"][cmd[1]].ignoreUser(cmd[2]);
            }
            else if(cmd[0] == "!list") {
                var msg = cmd[1];
                var git = getBotForChannel("git", cmd[1]);
                var quips = getBotForChannel("quips", cmd[1]);
                var event = getBotForChannel("event", cmd[1]);

                if(git || quips || event) {
                    msg += ": ";
                    if(git)
                        msg += "IssuesBot for "+git.options;
                    if(git && quips)
                        msg += ", ";
                    if(quips)
                        msg += "QuipsBot";
                    if(event && (quips || git))
                        msg += ", ";
                    if(event)
                        msg += "EventBot for "+event.options;
                }

                client.say(from, msg);
            }
            else if(cmd[0] == "!start") {
                addBot(cmd[2], cmd[1], cmd[3]);
            }
            else if(cmd[0] == "!stop") {
                stopBot(cmd[2], cmd[1]);
            }
            else {
                client.say(from, "Command not found.");
            }
        }
        else if(from == owner) {
            if(cmd[0] == "!list") {
                var channels = storage.getItem("chans");
                var msg;
                channels.forEach(function(channel) {
                    msg = channel;
                    var git = getBotForChannel("git", channel);
                    var quips = getBotForChannel("quips", channel);
                    var event = getBotForChannel("event", channel);

                    if(git || quips || event) {
                        msg += ": ";
                        if(git)
                            msg += "IssuesBot for "+git.options;
                        if(git && quips)
                            msg += ", ";
                        if(quips)
                            msg += "QuipsBot";
                        if(event && (quips || git))
                            msg += ", ";
                        if(event)
                            msg += "EventBot for "+event.options;
                    }

                    client.say(from, msg);
                });
            }
            else {
                client.say(from, "Command not found.");
            }
        }
        else {
            client.say(from, "You do not have the permission to execute commands for this channel.");
        }
    }
    else {
	    client.say(from, "I am a Node.js based GitHub Issues bot that displays informations to mentioned issues. To trigger me, just reference the issue with #[issuenumber], [owner]/[repo]#[issue] or a github link to the issue. If you want to add me to a channel, use /invite commands after that can be seen here in direct messaging with !help. My master is '"+owner+"' and they can control everything. You can find my source on https://github.com/freaktechnik/irc-issues-bot.");
    }
});
