import test from 'ava';
import Scheduler from '../scheduler';

const SAFE_DELTA = 4;

test.beforeEach((t) => {
    t.context.s = new Scheduler();
});

test.afterEach.always((t) => {
    t.false(t.context.s.hasTimeout());
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

test.serial("schedule exact", async (t) => {
    const s = t.context.s;

    let scheduledOn;
    const p = new Promise((resolve) => {
        scheduledOn = Date.now();
        s.scheduleExact(scheduledOn + 500, resolve);
    });
    await p;
    t.true(Math.abs((Date.now() - scheduledOn) - 500) < 100);
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
    const DELTA = INTERVAL / SAFE_DELTA;

    let scheduledOn;
    const promiseHolder = {
        r: null,
        p: null
    };
    promiseHolder.p = new Promise((resolve) => {
        scheduledOn = Date.now();
        promiseHolder.r = resolve;
        s.scheduleRepeating(INTERVAL, () => {
            promiseHolder.r();
        });
        t.true(s.hasTimeout());
        t.is(s.currentTimeout, INTERVAL);
    });

    for(let i = 1; i < 10; ++i) {
        await promiseHolder.p;
        promiseHolder.p = new Promise((resolve) => {
            promiseHolder.r = resolve;
        });
        t.true(Math.abs(Date.now() - scheduledOn - i * INTERVAL) < DELTA);
        t.true(s.hasTimeout());
    }
    s.stop();
});


test.serial("schedule repeating with end time", async (t) => {
    const s = t.context.s;

    const INTERVAL = 200;
    const RUNS = 4;
    const DELTA = Math.ceil(INTERVAL / SAFE_DELTA);

    let scheduledOn;
    const promiseHolder = {
        r: null,
        p: null
    };

    promiseHolder.p = new Promise((resolve) => {
        scheduledOn = Date.now();
        s.scheduleRepeating(INTERVAL, () => {
            promiseHolder.r();
        }, scheduledOn + INTERVAL * RUNS);
        promiseHolder.r = resolve;
        t.true(s.hasTimeout());
    });

    const END = scheduledOn + INTERVAL * RUNS;

    for(let i = 1; i <= RUNS && Date.now() < END; ++i) {
        await promiseHolder.p;
        t.true(Math.abs(Date.now() - scheduledOn - i * INTERVAL) < DELTA);
        promiseHolder.p = new Promise((resolve) => {
            promiseHolder.r = resolve;
        });
    }
});

test.serial("schedule repeating smaller interval", async (t) => {
    const s = t.context.s;

    const INTERVAL = 500;
    const SMALLER_INTERVAL = Math.floor(INTERVAL / 3);
    const DELTA = Math.ceil(SMALLER_INTERVAL / SAFE_DELTA);

    s.scheduleRepeating(INTERVAL, () => {
        // nothing to do
    });
    t.is(s.currentTimeout, INTERVAL);

    let scheduledOn;
    const promiseHolder = {
        r: null,
        p: null
    };
    promiseHolder.p = new Promise((resolve) => {
        scheduledOn = Date.now();
        promiseHolder.r = resolve;
        s.scheduleRepeating(SMALLER_INTERVAL, () => {
            promiseHolder.r();
        });
        t.is(s.currentTimeout, SMALLER_INTERVAL);
    });

    for(let i = 1; i < 10; ++i) {
        await promiseHolder.p;
        promiseHolder.p = new Promise((resolve) => {
            promiseHolder.r = resolve;
        });
        t.true(Math.abs(Date.now() - scheduledOn - i * SMALLER_INTERVAL) < DELTA);
        t.is(s.currentTimeout, SMALLER_INTERVAL);
    }
    s.stop();
});

test.todo("schedule exact shorter than interval");