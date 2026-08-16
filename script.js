// ==========================================
// SMART COUNTER — UI LAYER
// ==========================================
// All counter state & logic lives in the
// DOM-free counter-core.js module; this file
// handles the DOM, animations, persistence,
// backend sync, auto-tick and shortcuts.

const { createCounter } = window.CounterCore;

// Counter core (state + logic)
const counter = createCounter();


// ==========================================
// DOM ELEMENTS
// ==========================================

const counterDisplay = document.getElementById("counter");
const messageDisplay = document.getElementById("message");
const historyList = document.getElementById("history");
const stepSelect = document.getElementById("step");
const decreaseBtn = document.getElementById("decrease");
const increaseBtn = document.getElementById("increase");
const resetBtn = document.getElementById("reset");
const darkModeBtn = document.getElementById("darkMode");
const autoBtn = document.getElementById("auto");
const autoSpeedSelect = document.getElementById("autoSpeed");
const copyBtn = document.getElementById("copy");


// ==========================================
// AUTO-TICK STATE
// ==========================================

let autoInterval = null;
let autoSpeedMs = 1000;


// ==========================================
// COUNTER ROLL ANIMATION
// ==========================================

let displayCount = null;
let countRaf = null;

function animateCountTo(target) {

    if (countRaf) {
        cancelAnimationFrame(countRaf);
        countRaf = null;
    }

    const from = (displayCount === null) ? 0 : displayCount;

    if (from === target) {
        counterDisplay.textContent = target;
        displayCount = target;
        return;
    }

    // Longer rolls for bigger jumps, capped for snappiness
    const duration = Math.min(700, 250 + Math.abs(target - from) * 25);
    const startTime = performance.now();

    function frame(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        counterDisplay.textContent = Math.round(from + (target - from) * eased);

        if (progress < 1) {
            countRaf = requestAnimationFrame(frame);
        } else {
            counterDisplay.textContent = target;
            displayCount = target;
            countRaf = null;
        }
    }

    countRaf = requestAnimationFrame(frame);
}


// ==========================================
// UPDATE UI
// ==========================================

function updateUI() {

    const state = counter.getState();

    // Roll the displayed number to the new value (counts up on load)
    animateCountTo(state.count);

    // Counter message
    if (state.count === 0) {
        messageDisplay.textContent = "Minimum counter limit reached (0).";
        messageDisplay.classList.add("message--limit");
    } else {
        messageDisplay.textContent = "Ready";
        messageDisplay.classList.remove("message--limit");
    }

    // Disable decrease at 0
    decreaseBtn.disabled = state.count <= 0;

    // Update step selector
    stepSelect.value = state.step;

    // Update history
    updateHistory();

    // Dark mode
    if (state.darkMode) {
        document.body.classList.add("dark-mode");
        darkModeBtn.textContent = "☀️ Light Mode";
    } else {
        document.body.classList.remove("dark-mode");
        darkModeBtn.textContent = "🌙 Dark Mode";
    }

    // Auto-tick button state
    if (autoInterval) {
        autoBtn.classList.add("auto-btn--active");
        autoBtn.textContent = "⏸ Pause";
    } else {
        autoBtn.classList.remove("auto-btn--active");
        autoBtn.textContent = "▶ Auto-tick";
    }
}


// ==========================================
// UPDATE HISTORY
// ==========================================

function updateHistory() {

    const state = counter.getState();

    if (state.history.length === 0) {
        historyList.innerHTML = `
            <p class="empty-history">
                No actions recorded yet.
            </p>
        `;

        return;
    }

    historyList.innerHTML = state.history
        .map(item => `<p class="history-item">${item}</p>`)
        .join("");

    // Slide-in highlight for the newest entry
    const firstItem = historyList.firstElementChild;
    if (firstItem) {
        firstItem.classList.add("history-item-new");
    }
}


// ==========================================
// BUMP COUNTER ANIMATION
// ==========================================

function bumpCounter() {

    counterDisplay.classList.remove("bump");
    void counterDisplay.offsetWidth;
    counterDisplay.classList.add("bump");
}


// ==========================================
// PERSISTENCE & BACKEND
// ==========================================

function saveState() {

    localStorage.setItem(
        "smartCounterState",
        JSON.stringify(counter.getState())
    );
}

function loadState() {

    const savedState =
        localStorage.getItem("smartCounterState");

    if (savedState) {

        try {

            counter.load(JSON.parse(savedState));

        } catch (e) {

            console.error("Could not parse saved state:", e);
        }
    }
}

async function syncBackend(count) {

    try {

        const response = await fetch("api/counter", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({ count })
        });

        const data = await response.json();

        console.log("Backend response:", data);

    } catch (error) {

        console.error(
            "Error sending counter to backend:",
            error
        );
    }
}

async function loadCounterFromBackend() {

    try {

        const response =
            await fetch("api/counter");

        const data =
            await response.json();

        console.log(
            "Counter loaded from backend:",
            data
        );

        if (typeof data.count === "number") {

            counter.load({ count: data.count });

            updateUI();
            saveState();
        }

    } catch (error) {

        console.error(
            "Could not connect to backend:",
            error
        );
    }
}


// ==========================================
// MANUAL ACTIONS
// ==========================================

function increase() {

    const state = counter.increase();

    updateUI();
    bumpCounter();
    saveState();
    syncBackend(state.count);
}

function decrease() {

    const state = counter.decrease();

    updateUI();
    bumpCounter();
    saveState();
    syncBackend(state.count);
}

function resetCounter() {

    const state = counter.reset();

    updateUI();
    bumpCounter();
    saveState();
    syncBackend(state.count);
}

function changeStep() {

    const state = counter.setStep(Number(stepSelect.value));

    updateUI();
    saveState();
}

function toggleDarkMode() {

    const state = counter.toggleDarkMode();

    updateUI();
    saveState();
}


// ==========================================
// AUTO-TICK
// ==========================================

function autoTickOnce() {

    counter.tick();

    updateUI();
    saveState();
}

function startAutoTick() {

    if (autoInterval) return;

    autoInterval = setInterval(autoTickOnce, autoSpeedMs);

    updateUI();
}

function stopAutoTick() {

    if (autoInterval) {

        clearInterval(autoInterval);
        autoInterval = null;

        updateUI();
    }
}

function toggleAutoTick() {

    if (autoInterval) {
        stopAutoTick();
    } else {
        startAutoTick();
    }
}

function changeAutoSpeed() {

    autoSpeedMs = Number(autoSpeedSelect.value) || 1000;

    // Restart the interval with the new speed
    if (autoInterval) {

        clearInterval(autoInterval);
        autoInterval = setInterval(autoTickOnce, autoSpeedMs);
    }
}


// ==========================================
// COPY VALUE
// ==========================================

let copyResetTimer = null;

function fallbackCopy(text, done) {

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand("copy");
    } catch (e) {
        /* clipboard unavailable */
    }

    document.body.removeChild(textarea);
    done();
}

function copyCount() {

    const value = String(counter.getState().count);

    const done = () => {

        copyBtn.textContent = "✓ Copied";
        copyBtn.classList.add("copy-btn--copied");

        clearTimeout(copyResetTimer);
        copyResetTimer = setTimeout(() => {

            copyBtn.textContent = "Copy";
            copyBtn.classList.remove("copy-btn--copied");

        }, 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {

        navigator.clipboard
            .writeText(value)
            .then(done)
            .catch(() => fallbackCopy(value, done));

    } else {

        fallbackCopy(value, done);
    }
}


// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================

document.addEventListener("keydown", (event) => {

    // Arrow Up = Increase
    if (event.key === "ArrowUp") {
        increase();
    }

    // Arrow Down = Decrease
    if (event.key === "ArrowDown") {
        decrease();
    }

    // R = Reset
    if (event.key.toLowerCase() === "r") {
        resetCounter();
    }

    // D = Dark Mode
    if (event.key.toLowerCase() === "d") {
        toggleDarkMode();
    }

    // A = Auto-tick
    if (event.key.toLowerCase() === "a") {
        toggleAutoTick();
    }

    // C = Copy value
    if (event.key.toLowerCase() === "c") {
        copyCount();
    }
});


// ==========================================
// EVENT LISTENERS
// ==========================================

increaseBtn.addEventListener("click", increase);

decreaseBtn.addEventListener("click", decrease);

resetBtn.addEventListener("click", resetCounter);

darkModeBtn.addEventListener("click", toggleDarkMode);

stepSelect.addEventListener("change", changeStep);

autoBtn.addEventListener("click", toggleAutoTick);

autoSpeedSelect.addEventListener("change", changeAutoSpeed);

copyBtn.addEventListener("click", copyCount);


// ==========================================
// START APPLICATION
// ==========================================

loadState();

updateUI();

loadCounterFromBackend();
