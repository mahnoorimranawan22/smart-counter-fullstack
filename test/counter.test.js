// ==========================================
// SMART COUNTER — CORE LOGIC TESTS
// ==========================================
// Run with: npm test

const test = require("node:test");
const assert = require("node:assert/strict");

const { createCounter, HISTORY_LIMIT } = require("../counter-core.js");

test("starts with the default state", () => {
    const c = createCounter();
    const s = c.getState();
    assert.equal(s.count, 10);
    assert.equal(s.step, 1);
    assert.deepEqual(s.history, []);
    assert.equal(s.darkMode, false);
});

test("accepts an initial state", () => {
    const c = createCounter({ count: 5, step: 3, darkMode: true, history: ["a"] });
    const s = c.getState();
    assert.equal(s.count, 5);
    assert.equal(s.step, 3);
    assert.equal(s.darkMode, true);
    assert.deepEqual(s.history, ["a"]);
});

test("increase adds the step and records history", () => {
    const c = createCounter();
    const s = c.increase();
    assert.equal(s.count, 11);
    assert.equal(s.history.length, 1);
    assert.match(s.history[0], /Increased by 1 → 11/);
});

test("increase respects a custom step", () => {
    const c = createCounter({ step: 5 });
    c.increase();
    assert.equal(c.getState().count, 15);
});

test("decrease subtracts the step", () => {
    const c = createCounter({ count: 10 });
    c.decrease();
    assert.equal(c.getState().count, 9);
    assert.match(c.getState().history[0], /Decreased by 1 → 9/);
});

test("decrease never goes negative", () => {
    const c = createCounter({ count: 1, step: 5 });
    c.decrease();
    assert.equal(c.getState().count, 0);
});

test("decrease at zero is a no-op", () => {
    const c = createCounter({ count: 0 });
    const before = c.getState();
    c.decrease();
    const after = c.getState();
    assert.equal(after.count, 0);
    assert.equal(after.history.length, before.history.length);
});

test("reset sets the count to zero", () => {
    const c = createCounter({ count: 42 });
    c.reset();
    assert.equal(c.getState().count, 0);
    assert.match(c.getState().history[0], /reset/i);
});

test("setStep updates the step", () => {
    const c = createCounter();
    c.setStep(5);
    assert.equal(c.getState().step, 5);
});

test("setStep rejects invalid values", () => {
    const c = createCounter();
    c.setStep(0);
    assert.equal(c.getState().step, 1);
    c.setStep(-3);
    assert.equal(c.getState().step, 1);
    c.setStep("abc");
    assert.equal(c.getState().step, 1);
    assert.equal(c.getState().history.length, 0);
});

test("history is capped at HISTORY_LIMIT entries", () => {
    const c = createCounter();
    for (let i = 0; i < 25; i++) c.increase();
    assert.equal(c.getState().history.length, HISTORY_LIMIT);
    assert.equal(c.getState().history.length, 10);
});

test("history keeps the most recent entries first", () => {
    const c = createCounter();
    for (let i = 0; i < 15; i++) c.increase();
    const first = c.getState().history[0];
    assert.match(first, /Increased by 1 → 25/);
});

test("tick increments without recording history", () => {
    const c = createCounter({ count: 5, step: 2 });
    const s = c.tick();
    assert.equal(s.count, 7);
    assert.equal(s.history.length, 0);
});

test("toggleDarkMode flips the flag and records history", () => {
    const c = createCounter();
    c.toggleDarkMode();
    assert.equal(c.getState().darkMode, true);
    assert.match(c.getState().history[0], /Dark mode enabled/);
    c.toggleDarkMode();
    assert.equal(c.getState().darkMode, false);
});

test("load replaces state and clamps oversized history", () => {
    const c = createCounter();
    const bigHistory = [];
    for (let i = 0; i < 30; i++) bigHistory.push("entry " + i);

    c.load({ count: 7, step: 3, darkMode: true, history: bigHistory });

    const s = c.getState();
    assert.equal(s.count, 7);
    assert.equal(s.step, 3);
    assert.equal(s.darkMode, true);
    assert.equal(s.history.length, HISTORY_LIMIT);
});

test("snapshots do not share references with internal state", () => {
    const c = createCounter();
    const s1 = c.getState();
    s1.count = 999;
    s1.history.push("hacked");
    const s2 = c.getState();
    assert.equal(s2.count, 10);
    assert.equal(s2.history.length, 0);
});

test("counters have a default label and auto config", () => {
    const c = createCounter();
    const s = c.getState();
    assert.equal(s.label, "Counter");
    assert.equal(s.auto.enabled, false);
    assert.equal(s.auto.speedMs, 1000);
});

test("createCounter accepts a label and auto config", () => {
    const c = createCounter({ label: "Steps", auto: { enabled: true, speedMs: 2000 } });
    const s = c.getState();
    assert.equal(s.label, "Steps");
    assert.equal(s.auto.enabled, true);
    assert.equal(s.auto.speedMs, 2000);
});

test("setAuto configures auto-tick behaviour", () => {
    const c = createCounter();
    c.setAuto(true, 5000);
    const s = c.getState();
    assert.equal(s.auto.enabled, true);
    assert.equal(s.auto.speedMs, 5000);

    c.setAuto(false);
    assert.equal(c.getState().auto.enabled, false);
    assert.equal(c.getState().auto.speedMs, 5000);

    // invalid speed is ignored
    c.setAuto(true, -10);
    assert.equal(c.getState().auto.speedMs, 5000);
});

test("milestone reports progress toward the next hundred", () => {
    const c = createCounter({ count: 10 });
    const m = c.milestone();
    assert.equal(m.current, 0);
    assert.equal(m.next, 100);
    assert.equal(m.progress, 10);
    assert.equal(m.complete, false);
});

test("milestone marks completion on exact multiples", () => {
    const c = createCounter({ count: 100 });
    const m = c.milestone();
    assert.equal(m.current, 100);
    assert.equal(m.next, 200);
    assert.equal(m.progress, 0);
    assert.equal(m.complete, true);
});

test("milestone at zero is not complete", () => {
    const c = createCounter({ count: 0 });
    const m = c.milestone();
    assert.equal(m.current, 0);
    assert.equal(m.next, 100);
    assert.equal(m.complete, false);
});

test("milestone supports a custom divisor", () => {
    const c = createCounter({ count: 50 });
    const m = c.milestone(50);
    assert.equal(m.current, 50);
    assert.equal(m.next, 100);
    assert.equal(m.progress, 0);
    assert.equal(m.complete, true);
});

test("load accepts label and auto config", () => {
    const c = createCounter();
    c.load({ label: "Reps", auto: { enabled: true, speedMs: 2000 } });
    const s = c.getState();
    assert.equal(s.label, "Reps");
    assert.equal(s.auto.enabled, true);
    assert.equal(s.auto.speedMs, 2000);
});
