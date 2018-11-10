"use strict";

const irc = require("irc"),
    storage = require("./storage"),
    randomItem = require("random-item");

function _storeQuip(channel, message) {
    if(message.includes("/")) {
        return;
    }
    return storage.getItem(`quips${channel}`)
        .then((quips = []) => {
            quips.push(message);
            return storage.setItem(`quips${channel}`, quips);
        });
}

function _getRandomQuip(channel) {
    return storage.getItem(`quips${channel}`)
        .then((quips) => {
            if(quips.length) {
                return randomItem(quips);
            }

            return " Hm?";
        });
}

function QuipsBot(client, channel) {
    this.ready = storage.getItem(`quips${channel}`)
        .then((item) => {
            if(!item || !item.length) {
                return storage.setItem(`quips${channel}`, []);
            }
        })
        .catch(console.error);

    if(!client || !(client instanceof irc.Client)) {
        throw new Error("Must pass an irc client argument to the constructor.");
    }
    else {
        this.client = client;
    }

    this.channel = channel;

    this.listener = function(from, message) {
        const pattern = new RegExp(`^${client.nick}:.{2,}`);
        if(pattern.test(message)) {
            this.ready
                .then(_storeQuip(channel, message.slice(++client.nick.length).trim()))
                .catch(console.error);
        }
        else if(message.includes(client.nick)) {
            this.ready
                .then(_getRandomQuip(channel))
                .then((quip) => {
                    client.say(channel, `${from}: ${quip}`);
                })
                .catch(console.error);
        }
    };
    this.client.addListener(`message${channel}`, this.listener);
    this.description = "QuipsBot";
}
QuipsBot.prototype.client = null;
QuipsBot.prototype.channel = "";

QuipsBot.prototype.stop = function() {
    this.client.removeListener(`message${this.channel}`, this.listener);
};

exports.QuipsBot = QuipsBot;
