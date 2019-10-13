
//TODO check validity of command args
"use strict";

const { Client } = require("irc"),
    { IssuesBot } = require("./issuesbot"),
    { QuipsBot } = require("./quipsbot"),
    storage = require("./storage"),
    { EventBot } = require("./eventbot"),
    botTypes = [
        "quips",
        "git",
        "event"
    ],
    APP_STARTING = 2,
    args = process.argv.slice(APP_STARTING),
    REQUIRED_ARG_COUNT = 2,
    NOT_FOUND = -1,
    ONE_ITEM = 1,
    DEFAULT_PORT = 6697;

Promise.all([
    storage.getItem("chans")
        .then((val) => {
            if(!val) {
                return storage.setItem("chans", []);
            }
        }),
    Promise.all(botTypes.map((type) => storage.getItem(`${type}bots`).then((val) => {
        if(!val) {
            return storage.setItem(`${type}bots`, []);
        }
    })))
])
    .then(() => storage.getItem("chans"))
    .then((channels) => {
        if(args.length < REQUIRED_ARG_COUNT && !process.env.IRCBOT_SERVER) {
            throw new Error("No target defined");
        }

        // IRC config
        const [
                server = process.env.IRCBOT_SERVER,
                nick = process.env.IRCBOT_USERNAME,
                owner = process.env.IRCBOT_OWNER,
                password = process.env.IRCBOT_PASSWORD
            ] = args,
            ircOptions = {
                channels,
                floodProtection: true,
                port: process.env.IRCBOT_PORT || DEFAULT_PORT,
                realName: 'IRC Issues Bot',
                secure: !process.env.IRCBOT_NOTSECURE,
                userName: nick
            },
            client = new Client(server, nick, ircOptions),
            bots = {
                "git": {},
                "quips": {},
                "event": {}
            };

        /*setInterval(() => {
            client.send('PONG', 'empty');
        }, 5 * 60 * 1000);*/

        function typeExists(type) {
            return type && botTypes.includes(type);
        }

        function joinChannelIfNeeded(channel) {
            return storage.getItem("chans")
                .then((chans = []) => {
                    if(!chans.includes(channel)) {
                        chans.push(channel);
                        client.join(channel);
                        return storage.setItem("chans", chans);
                    }
                });
        }

        function getBotIndex(type, channel) {
            return storage.getItem(`${type}bots`)
                .then((storedBots) => storedBots.findIndex((bot) => bot.channel == channel));
        }

        function stopBot(type, channel) {
            if(typeExists(type)) {
                return getBotIndex(type, channel)
                    .then((bot) => {
                        if(bot > NOT_FOUND) {
                            return Promise.all([
                                bot,
                                storage.getItem(`${type}bots`)
                            ]);
                        }
                        return [];
                    })
                    .then(([
                        bot,
                        _bots
                    ]) => {
                        _bots.splice(bot, ONE_ITEM);
                        return storage.setItem(`${type}bots`, _bots);
                    })
                    .then(() => {
                        if(channel in bots[type]) {
                            bots[type][channel].stop();
                            delete bots[type][channel];
                        }
                    });
            }
            return Promise.resolve(); // eslint-disable-line promise/no-return-wrap
        }

        function removeBots(channel) {
            return Promise.all(botTypes.map((type) => stopBot(type, channel)));
        }

        function leaveChannel(channel) {
            storage.getItem("chans")
                .then((channels) => {
                    channels.splice(channels.indexOf(channel), ONE_ITEM);
                    return storage.setItem("chans", channels || []);
                })
                .then(() => removeBots(channel))
                .then(() => client.part(channel, "My master needs me in other places!", () => { /*NULL*/ }))
                .catch(console.error);
        }

        function getRunningBotForChannel(type, channel) {
            return bots[type][channel];
        }

        function startBot(type, channel, options) {
            if(getRunningBotForChannel(type, channel)) {
                return;
            }

            return joinChannelIfNeeded(channel).then(() => {
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
            });
        }

        function startAllBots() {
            return Promise.all(botTypes.map((type) => storage.getItem(`${type}bots`)
                .then((bots) => Promise.all(bots.map((bot) => startBot(type, bot.channel, bot.options))))
            ));
        }

        function addBot(type, channel, options) {
            if(typeExists(type)) {
                joinChannelIfNeeded(channel)
                    .then(() => storage.getItem(`${type}bots`))
                    .then((persistBots) => Promise.all([
                        persistBots,
                        getBotIndex(type, channel)
                    ]))
                    .then(([
                        persistBots,
                        botIndex
                    ]) => {
                        if(botIndex == NOT_FOUND) {
                            persistBots.push({
                                channel,
                                options
                            });
                            return storage.setItem(`${type}bots`, persistBots);
                        }
                        return true;
                    })
                    .then((isRunning) => {
                        if(!isRunning) {
                            return startBot(type, channel, options);
                        }
                    })
                    .catch(console.error);
            }
        }

        function isUserOp(channel, user) {
            const status = client.chans[channel].users[user];
            // owner, op, or halfop
            return status == "~" || status == "@" || status == "%";
        }

        function listBotsInChannel(channel) {
            let msg = `${channel}: `;
            msg += botTypes.map((type) => {
                const bot = getRunningBotForChannel(type, channel);
                if(bot) {
                    return bot.description;
                }

                return null;
            }).filter((entry) => entry !== null)
                .join(", ");
            return msg;
        }

        function registerWithNickServ() {
            client.send("MODE", client.nick, "+B");
            if(password) {
                const tempModeListener = function(channel, by, mode, user) {
                    if(user == client.nick) {
                        client.removeListener("+mode", tempModeListener);
                        startAllBots().catch(console.error);
                    }
                };
                client.addListener("+mode", tempModeListener);

                client.say("NickServ", `IDENTIFY ${nick} ${password}`);
                if(client.nick != nick) {
                    client.say("NickServ", `RECOVER ${nick}`);
                    client.send("NICK", nick);
                    client.say("ChanServ", "UP");
                }
            }
            else {
                startAllBots().catch(console.error);
            }
        }
        client.addListener("registered", registerWithNickServ);

        client.addListener("invite", (channel) => {
            joinChannelIfNeeded(channel).catch(console.error);
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
            if(message.startsWith("!")) {
                const [
                    command,
                    channel,
                    extra,
                    arg
                ] = message.split(" ");
                if(command == "!help") {
                    client.say(from, "Supported commands: !leave #channel, !join #channel, !git #channel owner/repo, !quips #channel, !ignore #channel username, !list, !start #channel type args, !stop #channel type, !types");
                }
                else if(command == "!types") {
                    client.say(from, botTypes.join(", "));
                }
                else if(channel && channel.startsWith("#") &&
                    ( from == owner || isUserOp(channel, from) )) {
                    if(command == "!leave") {
                        leaveChannel(channel);
                    }
                    else if(command == "!join") {
                        joinChannelIfNeeded(channel).catch(console.error);
                    }
                    else if(command == "!git" && extra) {
                        addBot("git", channel, extra);
                    }
                    else if(command == "!quips") {
                        addBot("quips", channel);
                    }
                    else if(command == "!ignore" && extra) {
                        bots.git[channel].ignoreUser(extra);
                    }
                    else if(command == "!list") {
                        if(channel in client.chans) {
                            client.say(from, listBotsInChannel(channel));
                        }
                        else {
                            client.say(from, `Bot is not in ${channel}.`);
                        }
                    }
                    else if(command == "!start" && extra && arg) {
                        addBot(extra, channel, arg);
                    }
                    else if(command == "!stop" && extra) {
                        stopBot(extra, channel);
                    }
                    else {
                        client.say(from, "Command not found.");
                    }
                }
                else if(from == owner) {
                    if(command == "!list") {
                        storage.getItem("chans")
                            .then((chans) => {
                                chans.forEach((chan) => {
                                    client.say(from, listBotsInChannel(chan));
                                });
                            })
                            .catch(console.error);
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
                client.say(from, `I am a Node.js based GitHub Issues bot that displays informations to mentioned issues. To trigger me, just reference the issue with #[issuenumber], [owner]/[repo]#[issue] or a github link to the issue. If you want to add me to a channel, use /invite; commands for configuration can be seen here in direct messaging with !help. My master is '${owner}' and they can control everything. You can find my source under https://github.com/freaktechnik/irc-issues-bot.`);
            }
        });
    })
    .catch(console.error);
