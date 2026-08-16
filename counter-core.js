// ==========================================
// SMART COUNTER — CORE LOGIC
// ==========================================
// Pure counter state machine with no DOM
// dependencies, so it can be unit tested
// with Node and reused directly in the
// browser via window.CounterCore.

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.CounterCore = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var HISTORY_LIMIT = 10;

    function createCounter(initial) {
        var state = {
            count: 10,
            step: 1,
            history: [],
            darkMode: false,
            label: "Counter",
            auto: {
                enabled: false,
                speedMs: 1000
            }
        };

        if (initial && typeof initial === "object") {
            if (typeof initial.count === "number") state.count = initial.count;
            if (typeof initial.step === "number" && initial.step > 0) state.step = initial.step;
            if (Array.isArray(initial.history)) state.history = initial.history.slice();
            if (typeof initial.darkMode === "boolean") state.darkMode = initial.darkMode;
            if (typeof initial.label === "string" && initial.label.trim() !== "") {
                state.label = initial.label.trim();
            }
            if (initial.auto && typeof initial.auto === "object") {
                if (typeof initial.auto.enabled === "boolean") state.auto.enabled = initial.auto.enabled;
                if (typeof initial.auto.speedMs === "number" && initial.auto.speedMs > 0) {
                    state.auto.speedMs = initial.auto.speedMs;
                }
            }
        }

        function snapshot() {
            return {
                count: state.count,
                step: state.step,
                history: state.history.slice(),
                darkMode: state.darkMode,
                label: state.label,
                auto: {
                    enabled: state.auto.enabled,
                    speedMs: state.auto.speedMs
                }
            };
        }

        function addHistory(action) {
            state.history.unshift(action);
            if (state.history.length > HISTORY_LIMIT) {
                state.history.pop();
            }
        }

        return {
            getState: snapshot,

            increase: function () {
                state.count += state.step;
                addHistory("➕ Increased by " + state.step + " → " + state.count);
                return snapshot();
            },

            decrease: function () {
                if (state.count <= 0) return snapshot();
                state.count -= state.step;
                if (state.count < 0) state.count = 0;
                addHistory("➖ Decreased by " + state.step + " → " + state.count);
                return snapshot();
            },

            reset: function () {
                state.count = 0;
                addHistory("🔄 Counter reset → 0");
                return snapshot();
            },

            setStep: function (step) {
                var value = Number(step);
                if (isNaN(value) || value <= 0) return snapshot();
                state.step = value;
                addHistory("⚙️ Step changed → " + state.step);
                return snapshot();
            },

            // Auto-tick: increments without recording history entries
            tick: function () {
                state.count += state.step;
                return snapshot();
            },

            // Configure auto-tick behaviour
            setAuto: function (enabled, speedMs) {
                state.auto.enabled = !!enabled;
                if (typeof speedMs === "number" && speedMs > 0) {
                    state.auto.speedMs = speedMs;
                }
                return snapshot();
            },

            // Progress toward the next milestone (default: every 100)
            milestone: function (divisor) {
                var d = (typeof divisor === "number" && divisor > 0) ? divisor : 100;
                var current = Math.floor(state.count / d) * d;
                var progress = state.count % d;
                return {
                    current: current,
                    next: current + d,
                    progress: progress,
                    complete: state.count > 0 && progress === 0
                };
            },

            toggleDarkMode: function () {
                state.darkMode = !state.darkMode;
                addHistory(state.darkMode ? "🌙 Dark mode enabled" : "☀️ Light mode enabled");
                return snapshot();
            },

            // Replace state from saved data (e.g. localStorage or backend)
            load: function (data) {
                if (data && typeof data === "object") {
                    if (typeof data.count === "number") state.count = data.count;
                    if (typeof data.step === "number" && data.step > 0) state.step = data.step;
                    if (Array.isArray(data.history)) {
                        state.history = data.history.slice();
                        if (state.history.length > HISTORY_LIMIT) {
                            state.history = state.history.slice(0, HISTORY_LIMIT);
                        }
                    }
                    if (typeof data.darkMode === "boolean") state.darkMode = data.darkMode;
                    if (typeof data.label === "string" && data.label.trim() !== "") {
                        state.label = data.label.trim();
                    }
                    if (data.auto && typeof data.auto === "object") {
                        if (typeof data.auto.enabled === "boolean") state.auto.enabled = data.auto.enabled;
                        if (typeof data.auto.speedMs === "number" && data.auto.speedMs > 0) {
                            state.auto.speedMs = data.auto.speedMs;
                        }
                    }
                }
                return snapshot();
            }
        };
    }

    return {
        createCounter: createCounter,
        HISTORY_LIMIT: HISTORY_LIMIT
    };
}));
