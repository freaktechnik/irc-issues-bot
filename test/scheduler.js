import test from 'ava';
import Scheduler from '../scheduler';

test("constructor", (t) => {
    const s = new Scheduler();
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
    const s = new Scheduler();
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

test("schedule exact", async (t) => {
    const s = new Scheduler();

    let scheduledOn;
    const p = new Promise((resolve) => {
        scheduledOn = Date.now();
        s.scheduleExact(scheduledOn + 500, resolve);
    });
    await p;
    t.true(Math.abs((Date.now() - scheduledOn) - 500) < 100);
    t.false(s.hasTimeout());
});

test.todo("schedule repeating");

test.todo("schedule repeating smaller interval");
test.todo("schedule exact shorter than interval");
