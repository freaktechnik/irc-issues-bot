var irc = require("irc");
var ical = require("ical");
var request = require("request");

var SEPARATOR = " | ";
var INTERVAL = 3600000; // 1 hour, I think.
var HOUR = INTERVAL;

//TODO tz correction?
function getNextEvent(data) {
    var now = Date.now();
    var nextDate;
    var nextIndex;
    for(var i in data) {
        if(data.hasOwnProperty(i) && ((!nextDate || data[i].start.getTime() < nextDate) && data[i].end.getTime() > now)) {
            nextIndex = i;
            nextDate = data[i].start.getTime();
        }
    }
    return data[nextIndex];
}

function EventBot(client, channel, query) {
    if(!client || !(client instanceof irc.Client))
		throw new Error("Must pass an irc client argument to the constructor.");
	else
		this.client = client;
	this.channel = channel;
	this.query = query;

	// cache warmup
	this.getCurrentOrNextEventURL();

	var that = this;

	this.iid = setInterval(function() {
	    that.doStuff();
        try {
	        if(that.event && that.event.start.getTime() >= Date.now() && that.event.start.getTime() <= Date.now() - INTERVAL) {
	            var startsIn = new Date(Date.now() - that.event.start.getTime());
	            client.say(channel, that.event.summary+" ("+that.event.url+") starts in "+startsIn.getHours()+" hours and "+startsIn.getMinutes()+" minutes.");
            }
        } catch(e) {
            client.say(channel, "Failed to say something about the next event");
            client.say("freaktechnik", e);
        }
	}, INTERVAL);
	this.doStuff();
	this.description = "EventBot for "+query;
}
EventBot.prototype.listener = null;
EventBot.prototype.client = null;
EventBot.prototype.iid = null;
EventBot.prototype.query = "";
EventBot.prototype.topic = "";
EventBot.prototype.topicCallback = null;
EventBot.prototype.event = null;
EventBot.prototype.doStuff = function() {
    var that = this;
    this.getTopic(function(topic) {
        that.updateTopic(topic);
    });
};
EventBot.prototype.canSetTopic = function() {
    return true;
/* doesn't work for the bot itself
    var channel = this.client.chans[this.channel];
    console.log(channel.users);
    var status = channel.users[this.client.nick];
    var isOP = status == "~" || status == "@" || status == "%";

    console.log(channel.mode, isOP);

    return (channel.mode != "" && channel.mode.indexOf("t") == -1) || isOP;*/
};
EventBot.prototype.getCurrentOrNextEventURL = function(cbk) {
    var that = this;
    ical.fromURL('https://reps.mozilla.org/events/period/future/search/'+this.query+'/ical/', {}, function(error, data) {
        if(!error && data && getNextEvent(data)) {
            that.event = getNextEvent(data);
            if(cbk)
                cbk(that.event.url);
        }
        else {
            that.event = null;
            if(cbk)
                cbk("No event planned");
        }
    });
};
EventBot.prototype.getEventString = function(cbk) {
    this.getCurrentOrNextEventURL(function(url) {
        cbk("Next event: "+url);
    });
};
EventBot.prototype.topicCurrent = function(topic, cbk) {
    this.getEventString(function(string) {
        cbk(topic.split(SEPARATOR).pop() == string);
    });
};
EventBot.prototype.getNewTopic = function(topic, cbk) {
    this.getEventString(function(string) {
        var arr = topic.split(SEPARATOR);
        arr.splice(-1, 1, string);
        cbk(arr.join(SEPARATOR));
    });
};
EventBot.prototype.updateTopic = function(topic) {
    var that = this;
    if(!this.canSetTopic())
        return;

    this.topicCurrent(topic, function(isCurrent) {
        if(!isCurrent) {
            that.getNewTopic(topic, function(newTopic) {
                that.client.send("TOPIC", that.channel, newTopic);
            });
        }
    });
};
EventBot.prototype.getTopic = function(cbk) {
    if(cbk) {
        if(this.channel in this.client.chans && "topic" in this.client.chans[this.channel])
            cbk(this.client.chans[this.channel].topic);
        else {
            var that = this;
            var tempListener = function(channel, topic) {
                that.client.removeListener("topic", tempListener);
                tempListener = null;
                if(channel == that.channel)
                    cbk(topic);
            };
            this.client.addListener("topic", tempListener);
        }
    }
};
EventBot.prototype.stop = function() {
    clearInterval(this.iid);
};

exports.EventBot = EventBot;
