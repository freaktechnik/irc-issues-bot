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
        nextIndex = null;
    for(const i in data) {
        if(data.hasOwnProperty(i) && ((!nextDate || data[i].start.getTime() < nextDate) && data[i].end.getTime() > now)) {
            nextIndex = i;
            nextDate = data[i].start.getTime();
        }
    }
    if(nextIndex !== null) {
        return data[nextIndex];
    }
    return null;
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

    this.scheduler.scheduleRepeating(INTERVAL, this.doStuff.bind(this));
    this.doStuff();
    this.description = "EventBot for " + query;
}
EventBot.prototype.listener = null;
EventBot.prototype.client = null;
EventBot.prototype.query = "";
EventBot.prototype.topic = "";
EventBot.prototype.nextScheduled = false;
EventBot.prototype.doStuff = function() {
    this.getTopic().then(this.updateTopic.bind(this));
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

EventBot.prototype.announceEvent = function(event) {
    try {
        const startsIn = new Date(event.start.getTime() - Date.now());
        this.client.say(this.channel, event.summary + " (" + event.url + ") starts in " + startsIn.getHours() + " hours and " + startsIn.getMinutes() + " minutes.");
    }
    catch(e) {
        this.client.say(this.channel, "Failed to say something about the next event");
        this.client.say("freaktechnik", e);
    }
};

EventBot.prototype.getCurrentOrNextEventURL = function() {
    return new Promise((resolve) => {
        ical.fromURL('https://reps.mozilla.org/events/period/future/search/' + this.query + '/ical/', {}, (error, data) => {
            if(!error && data) {
                const event = getNextEvent(data);
                if(event !== null) {
                    if(!this.nextScheduled) {
                        // Announce the even INTERVAL before it begins
                        this.scheduler.scheduleExact(event.start.getTime() - INTERVAL, this.announceEvent.bind(this, event));
                        // Ensure the event gets removed from the topic within timely manner.
                        this.scheduler.scheduleExact(event.end.getTime() + 60001, () => {
                            this.nextScheduled = false;
                            this.doStuff();
                        });
                        this.nextScheduled = true;
                    }
                    resolve(event.url);
                    return;
                }
            }
            resolve("No event planned");
        });
    });
};
EventBot.prototype.getEventString = function() {
    this.getCurrentOrNextEventURL().then((url) => {
        return "Next event: " + url;
    });
};
EventBot.prototype.topicCurrent = function(topic, eventString) {
    return topic.split(SEPARATOR).pop() == eventString;
};
EventBot.prototype.getNewTopic = function(topic, eventString) {
    const arr = topic.split(SEPARATOR);
    arr.splice(-1, 1, eventString);
    return arr.join(SEPARATOR);
};
EventBot.prototype.updateTopic = function(topic) {
    if(!this.canSetTopic()) {
        return;
    }

    this.getEventString().then((eventString) => {
        if(!this.topicCurrent(topic, eventString)) {
            this.client.send("TOPIC", this.channel, this.getNewTopic(topic, eventString));
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
