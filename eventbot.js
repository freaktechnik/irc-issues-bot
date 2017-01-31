"use strict";

const irc = require("irc"),
    ical = require("ical"),
    Scheduler = require("./scheduler"),
    SEPARATOR = " | ",
    INTERVAL = 3600000; // 1 hour, I think.

//TODO tz correction?
function getNextEvent(data) {
    const now = Date.now();
    let nextDate,
        nextIndex;
    for(const i in data) {
        if(data.hasOwnProperty(i) && ((!nextDate || data[i].start.getTime() < nextDate) && data[i].end.getTime() > now)) {
            nextIndex = i;
            nextDate = data[i].start.getTime();
        }
    }
    return data[nextIndex];
}

function EventBot(client, channel, query) {
    if(!client || !(client instanceof irc.Client)) {
        throw new Error("Must pass an irc client argument to the constructor.");
    }
    else {
        this.client = client;
    }
    this.channel = channel;
    this.query = query;
    this.scheduler = new Scheduler();

    // cache warmup
    this.getCurrentOrNextEventURL();

    this.scheduler.scheduleRepeating(INTERVAL, () => {
        this.doStuff();
    });
    this.doStuff();
    this.description = "EventBot for " + query;
}
EventBot.prototype.listener = null;
EventBot.prototype.client = null;
EventBot.prototype.query = "";
EventBot.prototype.topic = "";
EventBot.prototype.event = null;
EventBot.prototype.doStuff = function() {
    this.getTopic((topic) => {
        this.updateTopic(topic);
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

EventBot.prototype.announceEvent = function() {
    try {
        const startsIn = new Date(this.event.start.getTime() - Date.now());
        this.client.say(this.channel, this.event.summary + " (" + this.event.url + ") starts in " + startsIn.getHours() + " hours and " + startsIn.getMinutes() + " minutes.");
    }
    catch(e) {
        this.client.say(this.channel, "Failed to say something about the next event");
        this.client.say("freaktechnik", e);
    }
};

EventBot.prototype.getCurrentOrNextEventURL = function() {
    return new Promise((resolve) => {
        ical.fromURL('https://reps.mozilla.org/events/period/future/search/' + this.query + '/ical/', {}, (error, data) => {
            if(!error && data && getNextEvent(data)) {
                this.event = getNextEvent(data);
                // Announce the even INTERVAL before it begins
                this.scheduler.scheduleExact(this.event.start.getTime() - INTERVAL, this.announceEvent.bind(this));
                // Ensure the event gets removed from the topic within timely manner.
                this.scheduler.scheduleExact(this.event.end.getTime() + 10000, this.doStuff.bind(this));
                resolve(this.event.url);
            }
            else {
                this.event = null;
                resolve("No event planned");
            }
        });
    });
};
EventBot.prototype.getEventString = function() {
    this.getCurrentOrNextEventURL().then((url) => {
        return "Next event: " + url;
    });
};
EventBot.prototype.topicCurrent = function(topic) {
    this.getEventString().then((string) => {
        return topic.split(SEPARATOR).pop() == string;
    });
};
EventBot.prototype.getNewTopic = function(topic) {
    this.getEventString().then((string) => {
        const arr = topic.split(SEPARATOR);
        arr.splice(-1, 1, string);
        return arr.join(SEPARATOR);
    });
};
EventBot.prototype.updateTopic = function(topic) {
    if(!this.canSetTopic()) {
        return;
    }

    this.topicCurrent(topic).then((isCurrent) => {
        if(!isCurrent) {
            this.getNewTopic(topic).then((newTopic) => {
                this.client.send("TOPIC", this.channel, newTopic);
            });
        }
    });
};
EventBot.prototype.getTopic = function() {
    if(this.channel in this.client.chans && "topic" in this.client.chans[this.channel]) {
        return Promise.resolve(this.client.chans[this.channel].topic);
    }
    else {
        return new Promise((resolve) => {
            const tempListener = (channel, topic) => {
                if(channel == this.channel) {
                    this.client.removeListener("topic", tempListener);
                    resolve(topic);
                }
            };
            this.client.addListener("topic", tempListener);
        });
    }
};
EventBot.prototype.stop = function() {
    this.scheduler.stop();
};

exports.EventBot = EventBot;
