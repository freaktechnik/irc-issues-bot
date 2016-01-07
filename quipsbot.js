var irc = require("irc");
var localStorage = new require("node-localstorage").LocalStorage('./persist');
var randomItem = require("random-item");

var storage = {
    getItem: function(key) {
        return JSON.parse(localStorage.getItem(key));
    },
    setItem: function(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
};

QuipsBot.prototype.client = null;
QuipsBot.prototype.channel = "#nightingale";
function QuipsBot(client, channel) {
    if(!storage.getItem("quips"+channel)) {
        storage.setItem("quips"+channel, []);
    }

	if(!client)
		throw new Error("Must pass a client argument to the constructor.");
	else if(!(client instanceof irc.Client)) {

		this.client = new irc.Client(client.server,
                client.name,
                {
                    "channels": client.channels,
                    "floodProtection": true
                }
            );
	}
	else {
		this.client = client;
	}

    this.channel = channel;

	var that = this;
    this.listener = function(from, message) {
        var pattern = new RegExp("^"+that.client.opt.nick+":.{2,}");
        if(pattern.test(message)) {
            _storeQuip(that.channel, message.slice(that.client.opt.nick.length+1));
        }
        else if(message.indexOf(that.client.opt.nick)!=-1) {
            that.client.say(that.channel, from+":"+_getRandomQuip(that.channel));
        }
    };
    this.client.addListener("message"+channel, this.listener);
}

QuipsBot.prototype.stop = function() {
    this.client.removeListener("message"+this.channel, this.listener);
};

exports.QuipsBot = QuipsBot;

function _storeQuip(message, channel) {
    var quips = storage.getItem("quips"+channel);
    quips.push(message);
    storage.setItem("quips"+channel, quips);
}

function _getRandomQuip(channel) {
    var quips = storage.getItem("quips"+channel);
    if(quips.length > 0) {
        return randomItem(quips);
    }
    else {
        return " Hm?";
    }
}
