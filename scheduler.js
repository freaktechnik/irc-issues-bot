"use strict";

const gcd = require("greatest-common-divisor"),
    NO_TIMEOUT = 0,
    TRIGGERS_FOR_ONCE = 2;

function Scheduler() {
    this.scheduled = [];
    this.intermediateCbks = [];
}
Scheduler.prototype.TID = null;
Scheduler.prototype.currentTimeout = NO_TIMEOUT;
Scheduler.prototype.scheduled = [];
Scheduler.prototype.intermediateCbks = [];

Scheduler.prototype.hasTimeout = function() {
    return this.currentTimeout > NO_TIMEOUT || this.TID !== null;
};

Scheduler.prototype.check = function() {
    this.intermediateCbks.length = 0;
    const initialLength = this.scheduled.length;
    this.scheduled = this.scheduled.filter((so) => {
        if(so.type == 'repeating') {
            //TODO ensure timeouts that aren't a multple of the current interval also run correctly.
            if(Date.now() - so.lastRun >= so.interval) {
                so.callback();
                so.lastRun = Date.now();
            }
            return so.endTime === null || Date.now() < so.endTime;
        }
        else if(so.type == 'once') {
            if(Date.now() >= so.endTime) {
                so.callback();
                return false;
            }
            else if(so.endTime < Date.now() + this.currentTimeout) {
                // Precisely call the callback if it occurs before the next rundown of the queue.
                this.intermediateCbks.push(setTimeout(so.callback, so.endTime - Date.now()));
                return false;
            }
            return true;
        }
        return false;
    });

    if(!this.scheduled.length && this.hasTimeout()) {
        this.stop();
    }
    else if(this.scheduled.length < initialLength) {
        this.updateTimeout();
    }
};

Scheduler.prototype.getOptimalTimeout = function() {
    const timeouts = [];
    for(const t of this.scheduled) {
        if(t.type == 'repeating') {
            timeouts.push(t.interval);
        }
        else if(t.type == 'once') {
            timeouts.push(Math.floor((t.endTime - Date.now()) / TRIGGERS_FOR_ONCE));
        }
    }
    return Math.floor(gcd.apply(gcd, timeouts));
};

Scheduler.prototype.moveTimeout = function(target) {
    if(target == this.currentTimeout) {
        return;
    }
    if(this.hasTimeout()) {
        clearInterval(this.TID);
    }
    if(target > NO_TIMEOUT) {
        this.TID = setInterval(this.check.bind(this), target);
    }
    else {
        this.TID = null;
    }
    this.currentTimeout = target;
};

Scheduler.prototype.updateTimeout = function() {
    this.moveTimeout(this.getOptimalTimeout());
};

Scheduler.prototype.scheduleRepeating = function(interval, cbk, endTime = null) {
    if(endTime !== null && endTime < Date.now()) {
        throw new Error("Repeating end time is in the past");
    }
    this.scheduled.push({
        type: 'repeating',
        interval,
        callback: cbk,
        lastRun: Date.now(),
        endTime
    });
    this.updateTimeout();
};

Scheduler.prototype.scheduleExact = function(endTime, cbk) {
    if(endTime < Date.now()) {
        throw new Error("Alarm is in the past");
    }
    this.scheduled.push({
        type: 'once',
        endTime,
        callback: cbk
    });
    this.updateTimeout();
};

Scheduler.prototype.stop = function() {
    for(const id of this.intermediateCbks) {
        clearTimeout(id);
    }
    this.moveTimeout(NO_TIMEOUT);
};

module.exports = Scheduler;
