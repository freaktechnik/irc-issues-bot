
//TODO check validity of command args
"use strict";

const Client = require("irc").Client,
    IssuesBot = require("./issuesbot").IssuesBot,
    QuipsBot = require("./quipsbot").QuipsBot,
    storage = require("./storage"),
    EventBot = require("./eventbot").EventBot,
    botTypes = [ "quips", "git", "event" ],
    args = process.argv.slice(2);

if(!storage.getItem("chans")) {
    storage.setItem("chans", []);
}

botTypes.forEach((type) => {
    if(!storage.getItem(type + "bots")) {
        storage.setItem(type + "bots", []);
    }
});

if(args.length < 2 && !process.env.IRCBOT_SERVER) {
    throw new Error("No target defined");
}

// IRC config
const nick = args[1] || process.env.IRCBOT_USERNAME,
    password = args[3] || process.env.IRCBOT_PASSWORD,
    ircOptions = {
        channels: storage.getItem("chans"),
        floodProtection: true,
        port: process.env.IRCBOT_PORT || 6697,
        realName: 'IRC Issues Bot',
        secure: !process.env.IRCBOT_NOTSECURE,
        sasl: !!password,
        userName: nick,
        password
    },
    client = new Client(args[0] || process.env.IRCBOT_SERVER,
        nick, ircOptions
    ),
    bots = { "git": {}, "quips": {}, "event": {} },
    owner = args[2] || process.env.IRCBOT_OWNER;

setInterval(() => {
    client.send('PONG', 'empty');
}, 5 * 60 * 1000);

function typeExists(type) {
    return type && botTypes.indexOf(type) > -1;
}

function joinChannelIfNeeded(channel) {
    const channels = storage.getItem("chans") || [];
    if(channels.indexOf(channel) == -1) {
        channels.push(channel);
        storage.setItem("chans", channels);
        client.join(channel);
    }
}

function getBotIndex(type, channel) {
    let index = -1;
    const storedBots = storage.getItem(type + "bots");
    storedBots.some((bot, i) => {
        if(bot.channel == channel) {
            index = i;
            return true;
        }
        return false;
    });
    return index;
}

function stopBot(type, channel) {
    if(typeExists(type)) {
        const bot = getBotIndex(type, channel);
        if(bot > -1) {
            const _bots = storage.getItem(type + "bots");
            _bots.splice(bot, 1);
            storage.setItem(type + "bots", _bots);
            if(channel in bots[type]) {
                bots[type][channel].stop();
                delete bots[type][channel];
            }
        }
    }
}

function removeBots(channel) {
    botTypes.forEach((type) => {
        stopBot(type, channel);
    });
}

function leaveChannel(channel) {
    const channels = storage.getItem("chans");
    channels.splice(channels.indexOf(channel), 1);
    storage.setItem("chans", channels || []);
    removeBots(channel);
    client.part(channel, "My master needs me in other places!", () => { /*NULL*/ });
}

function getRunningBotForChannel(type, channel) {
    return bots[type][channel];
}

function startBot(type, channel, options) {
    if(getRunningBotForChannel(type, channel)) {
        return;
    }

    joinChannelIfNeeded(channel);
    let bot;
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

function startAllBots() {
    botTypes.forEach((type) => {
        storage.getItem(type + "bots").forEach((bot) => {
            startBot(type, bot.channel, bot.options);
        });
    });
}

function addBot(type, channel, options) {
    if(typeExists(type)) {
        joinChannelIfNeeded(channel);

        const persistBots = storage.getItem(type + "bots");

        if(getBotIndex(type, channel) == -1) {
            persistBots.push({ channel, options });
            storage.setItem(type + "bots", persistBots);

            startBot(type, channel, options);
        }
    }
}

function isUserOp(channel, user) {
    const status = client.chans[channel].users[user];
    // owner, op, or halfop
    return status == "~" || status == "@" || status == "%";
}

function listBotsInChannel(channel) {
    let msg = channel + ": ";
    msg += botTypes.map((type) => {
        const bot = getRunningBotForChannel(type, channel);
        if(bot) {
            return bot.description;
        }
        else {
            return null;
        }
    }).filter((entry) => {
        return entry !== null;
    }).join(", ");
    return msg;
}

function registerWithNickServ() {
    client.send("MODE", client.nick, "+B");
    if(password) {
        const tempModeListener = function(channel, by, mode, user) {
            if(user == client.nick) {
                client.removeListener("+mode", tempModeListener);
                startAllBots();
            }
        };
        client.addListener("+mode", tempModeListener);

        /**client.say("NickServ", "IDENTIFY " + nick + " " + password);*/
        if(client.nick != nick) {
            client.say("NickServ", "RECOVER " + nick);
            client.send("NICK", nick);
            client.say("ChanServ", "UP");
        }
    }
    else {
        startAllBots();
    }
}
client.addListener("registered", registerWithNickServ);

client.addListener("invite", (channel) => {
    joinChannelIfNeeded(channel);
});
client.addListener("error", (error) => {
    console.error(error);
});

client.addListener("quit", (username) => {
    if(username == nick) {
        registerWithNickServ();
    }
});

client.addListener("pm", (from, message) => {
    if(message.charAt(0) == "!") {
        const cmd = message.split(" ");
        if(cmd[0] == "!help") {
            client.say(from, "Supported commands: !leave #channel, !join #channel, !git #channel owner/repo, !quips #channel, !ignore #channel username, !list, !start #channel type args, !stop #channel type, !types");
        }
        else if(cmd[0] == "!types") {
            client.say(from, botTypes.join(", "));
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
                bots.git[cmd[1]].ignoreUser(cmd[2]);
            }
            else if(cmd[0] == "!list") {
                if(cmd[1] in client.chans) {
                    client.say(from, listBotsInChannel(cmd[1]));
                }
                else {
                    client.say(from, "Bot is not in " + cmd[1] + ".");
                }
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
                const channels = storage.getItem("chans");
                channels.forEach((channel) => {
                    client.say(from, listBotsInChannel(channel));
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
        client.say(from, "I am a Node.js based GitHub Issues bot that displays informations to mentioned issues. To trigger me, just reference the issue with #[issuenumber], [owner]/[repo]#[issue] or a github link to the issue. If you want to add me to a channel, use /invite; commands for configuration can be seen here in direct messaging with !help. My master is '" + owner + "' and they can control everything. You can find my source under https://github.com/freaktechnik/irc-issues-bot.");
    }
});
