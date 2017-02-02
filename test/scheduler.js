import test from 'ava';
import Scheduler from '../scheduler';
import sinon from 'sinon';

const SAFE_DELTA = 4;

let clock;

test.before(() => {
    clock = sinon.useFakeTimers();
});

test.beforeEach((t) => {
    t.context.s = new Scheduler();
});

test.afterEach.always((t) => {
    t.false(t.context.s.hasTimeout());
});

test.after(() => {
    clock.restore();
});

test("constructor", (t) => {
    const s = t.context.s;
    t.is(s.scheduled.length, 0);
    t.is(s.intermediateCbks.length, 0);

    s.scheduled.push("foo");
    s.intermediateCbks.push("bar");

    t.is(s.scheduled.length, 1);
    t.is(s.intermediateCbks.length, 1);
    t.is(Scheduler.prototype.scheduled.length, 0);
    t.is(Scheduler.prototype.intermediateCbks.length, 0);
});

test("set timeout", (t) => {
    const s = t.context.s;
    t.false(s.hasTimeout());
    t.is(s.currentTimeout, 0);
    t.is(s.TID, null);

    s.moveTimeout(1000);
    t.true(s.hasTimeout());
    t.is(s.currentTimeout, 1000);
    t.not(s.TID, null);

    s.stop();
    t.false(s.hasTimeout());
    t.is(s.currentTimeout, 0);
    t.is(s.TID, null);
});

test.serial("schedule exact", (t) => {
    const s = t.context.s;

    const INTERVAL = 500;

    const scheduledOn = Date.now();
    const cbk = sinon.spy();
    s.scheduleExact(scheduledOn + 500, cbk);
    clock.tick(INTERVAL);
    t.is(Date.now() - scheduledOn, INTERVAL);
    t.true(cbk.calledOnce);
});

test("Can't schedule in the past", (t) => {
    t.throws(() => t.context.s.scheduleExact(Date.now() - 1000, t.fail));
});

test("Can't schedule repeating ending in the past", (t) => {
    t.throws(() => t.context.s.scheduleRepeating(500, t.fail, Date.now() - 1000));
});

test.serial("schedule repeating", async (t) => {
    const s = t.context.s;

    const INTERVAL = 200;
    const RUNS = 10;

    const cbk = sinon.spy();
    s.scheduleRepeating(INTERVAL, cbk);
    t.true(s.hasTimeout());
    t.is(s.currentTimeout, INTERVAL);

    for(let i = 1; i < RUNS; ++i) {
        clock.tick(INTERVAL);
        t.true(s.hasTimeout());
        t.is(cbk.callCount, i);
    }
    s.stop();
});


test.serial("schedule repeating with end time", async (t) => {
    const s = t.context.s;

    const INTERVAL = 200;
    const RUNS = 4;

    const cbk = sinon.spy();
    s.scheduleRepeating(INTERVAL, cbk, Date.now() + INTERVAL * RUNS);

    for(let i = 1; i <= RUNS; ++i) {
        t.true(s.hasTimeout());
        clock.tick(INTERVAL);
        t.is(cbk.callCount, i);
    }
});

test.serial("schedule repeating smaller interval", async (t) => {
    const s = t.context.s;

    const INTERVAL = 500;
    const SMALLER_INTERVAL = Math.floor(INTERVAL / 3);
    const RUNS = 10;
    const INTERVAL_CALLS = Math.floor(SMALLER_INTERVAL * RUNS / INTERVAL);

    const slowCbk = sinon.spy();
    s.scheduleRepeating(INTERVAL, slowCbk);
    t.is(s.currentTimeout, INTERVAL);

    const cbk = sinon.spy();
    s.scheduleRepeating(SMALLER_INTERVAL, cbk);
    t.is(s.currentTimeout, SMALLER_INTERVAL);

    for(let i = 1; i < RUNS; ++i) {
        clock.tick(SMALLER_INTERVAL);
        t.is(s.currentTimeout, SMALLER_INTERVAL);
        t.is(cbk.callCount, i);
    }
    t.is(slowCbk.callCount, INTERVAL_CALLS);
    s.stop();
});

test.todo("schedule exact shorter than interval");
