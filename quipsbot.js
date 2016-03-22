var irc = require("irc");
var storage = require("./storage");
var randomItem = require("random-item");

QuipsBot.prototype.client = null;
QuipsBot.prototype.channel = "#nightingale";
function QuipsBot(client, channel) {
    if(!storage.getItem("quips"+channel).length) {
        storage.setItem("quips"+channel, []);
    }

	if(!client || !(client instanceof irc.Client))
		throw new Error("Must pass an irc client argument to the constructor.");
	else
		this.client = client;

    this.channel = channel;

    this.listener = function(from, message) {
        var pattern = new RegExp("^"+client.nick+":.{2,}");
        if(pattern.test(message)) {
            _storeQuip(channel, message.slice(client.nick.length+1).trim());
        }
        else if(message.indexOf(client.nick)!=-1) {
            client.say(channel, from+": "+_getRandomQuip(channel));
        }
    };
    this.client.addListener("message"+channel, this.listener);
    this.description = "QuipsBot";
}

QuipsBot.prototype.stop = function() {
    this.client.removeListener("message"+this.channel, this.listener);
};

exports.QuipsBot = QuipsBot;

function _storeQuip(channel, message) {
    if(message.indexOf("/") == 0)
        return;
    var quips = storage.getItem("quips"+channel) || [];
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
