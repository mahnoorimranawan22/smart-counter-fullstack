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
            darkMode: false
        };

        if (initial && typeof initial === "object") {
            if (typeof initial.count === "number") state.count = initial.count;
            if (typeof initial.step === "number" && initial.step > 0) state.step = initial.step;
            if (Array.isArray(initial.history)) state.history = initial.history.slice();
            if (typeof initial.darkMode === "boolean") state.darkMode = initial.darkMode;
        }

        function snapshot() {
            return {
                count: state.count,
                step: state.step,
                history: state.history.slice(),
                darkMode: state.darkMode
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
