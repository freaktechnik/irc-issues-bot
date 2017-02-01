"use strict";

function Scheduler() {
    this.scheduled = [];
    this.intermediateCbks = [];
}
Scheduler.prototype.TID = null;
Scheduler.prototype.currentTimeout = 0;
Scheduler.prototype.scheduled = [];
Scheduler.prototype.intermediateCbks = [];

Scheduler.prototype.hasTimeout = function() {
    return this.currentTimeout > 0 || this.TID !== null;
};

Scheduler.prototype.check = function() {
    this.intermediateCbks.length = 0;
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
            else if(so.endTime + this.currentTimeout > Date.now()) {
                // Precisely call the callback if it occurs before the next rundown of the queue.
                this.intermediateCbks.push(setTimeout(so.callback, so.endTime - Date.now()));
                return false;
            }
            return true;
        }
        return false;
    });

    if(this.scheduled.length == 0 && this.hasTimeout()) {
        this.stop();
    }
};

Scheduler.prototype.moveTimeout = function(target) {
    if(this.hasTimeout()) {
        clearInterval(this.TID);
    }
    if(target > 0) {
        this.TID = setInterval(this.check.bind(this), target);
    }
    else {
        this.TID = null;
    }
    this.currentTimeout = target;
};

Scheduler.prototype.scheduleRepeating = function(interval, cbk, endTime = null) {
    if(endTime !== null && endTime < Date.now()) {
        throw "Repeating end time is in the past";
    }
    this.scheduled.push({
        type: 'repeating',
        interval: interval,
        callback: cbk,
        lastRun: 0,
        endTime: endTime
    });
    if(interval < this.currentTimeout || !this.hasTimeout()) {
        this.moveTimeout(interval);
    }
};

Scheduler.prototype.scheduleExact = function(endTime, cbk) {
    if(endTime < Date.now()) {
        throw "Alarm is in the past";
    }
    this.scheduled.push({
        type: 'once',
        endTime: endTime,
        callback: cbk
    });
    if(!this.hasTimeout() || this.currentTimeout > endTime - Date.now()) {
        this.moveTimeout((endTime - Date.now()) / 2);
    }
};

Scheduler.prototype.stop = function() {
    this.moveTimeout(0);
};

module.exports = Scheduler;