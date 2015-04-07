var irc = require("irc");
var storage = require("node-persist");

QuipsBot.prototype.client = null;
QuipsBot.prototype.channel = "#nightingale";
function QuipsBot(client, channel) {
    storage.initSync();

    if(!storage.getItem("quips"+channel)) {
        storage.setItem("quips"+channel, []);
    }

	if(!client)
		throw new Error("Must pass a client argument to the constructor.");
	else if(!(client instanceof irc.Client)) {

		this.client = new irc.Client(client.server,
                client.name,
                {
                    "channels": client.channel,
                    "floodProtection": true
                }
            );
	}
	else {
		this.client = client;
	}

    this.channel = channel;

	var that = this;
    this.client.addListener("message"+channel, function(from, message) {
        var pattern = new RegExp("^"+that.client.opt.nick+":.{2,}");
        if(pattern.test(message)) {
            _storeQuip(that.channel, message.slice(that.client.opt.nick.length+1));
        }
        else if(message.indexOf(that.client.opt.nick)!=-1) {
            that.client.say(that.channel, from+":"+_getRandomQuip(that.channel));
        }
    });
}

exports.QuipsBot = QuipsBot;

function _storeQuip(message, channel) {
    var quips = storage.getItem("quips"+channel);
    quips.push(message);
    storage.setItem("quips"+channel, quips);
}

function _getRandomQuip(channel) {
    var quips = storage.getItem("quips"+channel),
        index = getRandomInt(0, quips.length);
    if(quips.length > 0) {
        return quips[index];
    }
    else {
        return "Hm?";
    }
}

// getRandomInt() from MDN:
// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
