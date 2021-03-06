import test from 'ava';
import Scheduler from '../scheduler';
import sinon from 'sinon';

let clock;

test.before(() => {
    clock = sinon.useFakeTimers();
});

test.after(() => {
    clock.restore();
});

test.beforeEach((t) => {
    t.context.s = new Scheduler();
});

test.afterEach.always((t) => {
    t.false(t.context.s.hasTimeout());
});

test("constructor", (t) => {
    const { s } = t.context;
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
    const { s } = t.context;
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
    const { s } = t.context;

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

test.serial("schedule repeating", (t) => {
    const { s } = t.context;

    const INTERVAL = 200;
    const RUNS = 10;

    const cbk = sinon.spy();
    s.scheduleRepeating(INTERVAL, cbk);
    t.true(s.hasTimeout());
    t.is(s.currentTimeout, INTERVAL);

    for(let i = 1; i <= RUNS; ++i) {
        clock.tick(INTERVAL);
        t.true(s.hasTimeout());
        t.is(cbk.callCount, i);
    }
    s.stop();
});


test.serial("schedule repeating with end time", (t) => {
    const { s } = t.context;

    const INTERVAL = 200;
    const RUNS = 4;

    const cbk = sinon.spy();
    s.scheduleRepeating(INTERVAL, cbk, Date.now() + (INTERVAL * RUNS));

    for(let i = 1; i <= RUNS; ++i) {
        t.true(s.hasTimeout());
        clock.tick(INTERVAL);
        t.is(cbk.callCount, i);
    }
});

test.serial("schedule repeating smaller interval", (t) => {
    const { s } = t.context;

    const INTERVAL = 500;
    const SMALLER_INTERVAL = Math.floor(INTERVAL / 5);
    const RUNS = 10;
    const INTERVAL_CALLS = Math.floor(SMALLER_INTERVAL * RUNS / INTERVAL);

    const slowCbk = sinon.spy();
    s.scheduleRepeating(INTERVAL, slowCbk);
    t.is(s.currentTimeout, INTERVAL);

    const cbk = sinon.spy();
    s.scheduleRepeating(SMALLER_INTERVAL, cbk);
    t.true(s.currentTimeout <= SMALLER_INTERVAL);

    for(let i = 1; i <= RUNS; ++i) {
        clock.tick(SMALLER_INTERVAL);
        t.true(s.currentTimeout <= SMALLER_INTERVAL);
        t.is(cbk.callCount, i);
    }
    t.is(slowCbk.callCount, INTERVAL_CALLS);
    s.stop();
});

test.serial("schedule exact shorter than interval", (t) => {
    const { s } = t.context;

    const INTERVAL = 500;
    const EXACT = Math.floor(INTERVAL / 5);

    const intervalCbk = sinon.spy();
    s.scheduleRepeating(INTERVAL, intervalCbk);

    t.true(s.hasTimeout());
    t.is(s.currentTimeout, INTERVAL);

    const exactCbk = sinon.spy();
    s.scheduleExact(Date.now() + EXACT, exactCbk);

    t.true(s.currentTimeout < INTERVAL);

    clock.tick(EXACT);

    t.true(exactCbk.calledOnce);
    t.false(intervalCbk.called);
    t.is(s.currentTimeout, INTERVAL);


    s.stop();
});
