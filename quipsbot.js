"use strict";

const irc = require("irc"),
    storage = require("./storage"),
    randomItem = require("random-item");

function _storeQuip(channel, message) {
    if(message.includes("/")) {
        return;
    }
    const quips = storage.getItem(`quips${channel}`) || [];
    quips.push(message);
    storage.setItem(`quips${channel}`, quips);
}

function _getRandomQuip(channel) {
    const quips = storage.getItem(`quips${channel}`);
    if(quips.length) {
        return randomItem(quips);
    }

    return " Hm?";
}

function QuipsBot(client, channel) {
    const item = storage.getItem(`quips${channel}`);
    if(!item || !item.length) {
        storage.setItem(`quips${channel}`, []);
    }

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
            _storeQuip(channel, message.slice(++client.nick.length).trim());
        }
        else if(message.includes(client.nick)) {
            client.say(channel, `${from}: ${_getRandomQuip(channel)}`);
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
