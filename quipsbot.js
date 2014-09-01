var irc = require("irc");
var storage = require("node-persist");

QuipsBot.prototype.client = null;
function QuipsBot(client) {
    storage.init();

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

	var that = this;
	this.client.addListener("message#", function(from, to, message) {
        var pattern = new RegExp("$"+that.client.opt.nick+":\h?");
        if(pattern.test(message)) {
            _storeQuip(message.slice(that.client.opt.nick+1));
        }
        else if(message.indexOf(that.client.opt.nick)!=-1) {
            that.client.say(to, _getRandomQuip());
        }
	});
}

exports.QuipsBot = QuipsBot;

function _storeQuip(message) {
    var quips = storage.getItem("quips");
    quips.push(message);
    storage.setItem("quips", quips);
}

function _getRandomQuip() {
    var quips = storage.getItem("quips"),
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
