var irc = require("irc");
var storage = require("./storage");
var randomItem = require("random-item");

QuipsBot.prototype.client = null;
QuipsBot.prototype.channel = "#nightingale";
function QuipsBot(client, channel) {
    if(!storage.getItem("quips"+channel)) {
        storage.setItem("quips"+channel, []);
    }

	if(!client || !(client instanceof irc.Client))
		throw new Error("Must pass an irc client argument to the constructor.");
	else
		this.client = client;

    this.channel = channel;

	var that = this;
    this.listener = function(from, message) {
        var pattern = new RegExp("^"+that.client.opt.nick+":.{2,}");
        if(pattern.test(message)) {
            _storeQuip(that.channel, message.slice(that.client.opt.nick.length+1).trim());
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
    if(message.indexOf("/") == 0)
        return;
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
