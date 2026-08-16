// ==========================================
// SMART COUNTER — UI LAYER
// ==========================================
// Manages multiple counters (tabs). Each
// counter's state & logic lives in the
// DOM-free counter-core.js module; this file
// handles the DOM, animations, persistence,
// backend sync, per-counter auto-tick and
// keyboard shortcuts.

const { createCounter } = window.CounterCore;

const STORAGE_KEY = "smartCounterStateV2";
const LEGACY_KEY = "smartCounterState";
const BG_KEY = "smartCounterBackground";
const MAX_COUNTERS = 8;
const MILESTONE_DIVISOR = 100;

// Background gallery (Unsplash)
const BACKGROUNDS = [
    { id: "ocean",  url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0", label: "Ocean" },
    { id: "lagoon", url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b", label: "Lagoon" },
    { id: "wave",   url: "https://images.unsplash.com/photo-1439405326854-014607f694d7", label: "Wave" },
    { id: "night",  url: "https://images.unsplash.com/photo-1519681393784-d120267933ba", label: "Night" },
    { id: "forest", url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05", label: "Forest" },
    { id: "beach",  url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e", label: "Beach" }
];


// ==========================================
// STATE
// ==========================================

let counters = [];
let activeIndex = 0;
const intervalIds = {};


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
const tabList = document.getElementById("tabList");
const milestoneLabel = document.getElementById("milestone-label");
const milestonePct = document.getElementById("milestone-pct");
const milestoneBar = document.getElementById("milestone-bar");
const heroImage = document.getElementById("heroImage");
const bgToggle = document.getElementById("bgToggle");
const bgPicker = document.getElementById("bgPicker");

function active() {
    return counters[activeIndex];
}


// ==========================================
// COUNTER ROLL ANIMATION
// ==========================================

let displayCount = null;
let countRaf = null;
let lastMilestoneComplete = null;

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
// TABS
// ==========================================

function renderTabs() {

    tabList.innerHTML = "";

    counters.forEach((counter, i) => {

        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = "tab" + (i === activeIndex ? " tab--active" : "");
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
        tab.dataset.index = i;

        const label = document.createElement("span");
        label.className = "tab-label";
        label.textContent = counter.getState().label;
        tab.appendChild(label);

        if (counters.length > 1) {

            const close = document.createElement("span");
            close.className = "tab-close";
            close.textContent = "×";
            close.title = "Remove " + label.textContent;
            close.dataset.remove = i;
            tab.appendChild(close);
        }

        tabList.appendChild(tab);
    });

    // Add-counter button
    const add = document.createElement("button");
    add.type = "button";
    add.className = "tab tab-add";
    add.textContent = "+";
    add.title = "Add counter";
    add.setAttribute("aria-label", "Add counter");
    add.disabled = counters.length >= MAX_COUNTERS;
    tabList.appendChild(add);
}

tabList.addEventListener("click", (event) => {

    const close = event.target.closest(".tab-close");

    if (close) {
        event.stopPropagation();
        removeCounter(Number(close.dataset.remove));
        return;
    }

    const tab = event.target.closest(".tab");
    if (!tab) return;

    if (tab.classList.contains("tab-add")) {
        addCounter();
        return;
    }

    if (tab.dataset.index !== undefined) {
        switchTab(Number(tab.dataset.index));
    }
});

function switchTab(index) {

    if (index < 0 || index >= counters.length) return;

    activeIndex = index;

    renderTabs();
    updateUI();
    saveState();
}

function addCounter() {

    if (counters.length >= MAX_COUNTERS) return;

    const label = "Counter " + (counters.length + 1);

    counters.push(createCounter({ label }));

    activeIndex = counters.length - 1;

    renderTabs();
    updateUI();
    saveState();
}

function removeCounter(index) {

    if (counters.length <= 1) return;

    stopInterval(index);

    counters.splice(index, 1);
    delete intervalIds[index];

    if (activeIndex > index) {
        activeIndex--;
    } else if (activeIndex === index) {
        activeIndex = Math.min(index, counters.length - 1);
    }

    renderTabs();
    updateUI();
    saveState();
}


// ==========================================
// UPDATE UI
// ==========================================

function updateUI() {

    const state = active().getState();
    const milestone = active().milestone(MILESTONE_DIVISOR);

    // Roll the displayed number to the new value (counts up on load)
    animateCountTo(state.count);

    // Counter message (limit → milestone → ready)
    let message = "Ready";
    let messageClass = "";

    if (state.count === 0) {
        message = "Minimum counter limit reached (0).";
        messageClass = "message--limit";
    } else if (milestone.complete) {
        message = "🎉 Milestone reached: " + state.count;
        messageClass = "message--milestone";
    }

    messageDisplay.textContent = message;
    messageDisplay.className = "message" + (messageClass ? " " + messageClass : "");

    // Milestone progress bar
    const pct = milestone.complete ? 100 : milestone.progress;

    milestoneLabel.textContent = milestone.current + " → " + milestone.next;
    milestonePct.textContent = pct + "%";
    milestoneBar.style.width = pct + "%";
    milestoneBar.classList.toggle("milestone-bar--full", milestone.complete);

    // Confetti when a milestone is freshly reached (not on page load)
    if (lastMilestoneComplete !== null && !lastMilestoneComplete && milestone.complete) {
        burstConfetti();
    }
    lastMilestoneComplete = milestone.complete;

    // Disable decrease at 0
    decreaseBtn.disabled = state.count <= 0;

    // Update step selector
    stepSelect.value = state.step;

    // Update history
    updateHistory();

    // Dark mode (global)
    document.body.classList.toggle("dark-mode", state.darkMode);
    darkModeBtn.textContent = state.darkMode ? "☀️ Light Mode" : "🌙 Dark Mode";

    // Auto-tick button + speed
    autoBtn.classList.toggle("auto-btn--active", state.auto.enabled);
    autoBtn.textContent = state.auto.enabled ? "⏸ Pause" : "▶ Auto-tick";
    autoSpeedSelect.value = state.auto.speedMs || 1000;
}


// ==========================================
// UPDATE HISTORY
// ==========================================

function updateHistory() {

    const state = active().getState();

    if (state.history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <img class="empty-history-img"
                    src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=200&q=60"
                    alt="">
                <span>No actions recorded yet.</span>
            </div>
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
// CONFETTI BURST
// ==========================================

function burstConfetti() {

    const container = document.querySelector(".counter-card");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + 70;

    const colors = ["#22d3ee", "#2dd4bf", "#38bdf8", "#14b8a6", "#fbbf24"];

    for (let i = 0; i < 26; i++) {

        const piece = document.createElement("span");
        piece.className = "confetti";

        piece.style.left = originX + "px";
        piece.style.top = originY + "px";
        piece.style.background = colors[i % colors.length];

        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 150;

        piece.style.setProperty("--dx", Math.cos(angle) * distance + "px");
        piece.style.setProperty("--dy", Math.sin(angle) * distance - 50 + "px");
        piece.style.animationDuration = (0.8 + Math.random() * 0.6) + "s";

        container.appendChild(piece);

        setTimeout(() => piece.remove(), 1600);
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

    const payload = {
        darkMode: counters[0] ? counters[0].getState().darkMode : false,
        activeIndex,
        counters: counters.map(c => c.getState())
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {

    let data = null;

    try {
        data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
        /* corrupted storage - start fresh */
    }

    // Migrate the legacy single-counter state
    if (!data) {

        let legacy = null;

        try {
            legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
        } catch (e) {
            /* no legacy state */
        }

        if (legacy && typeof legacy === "object") {

            data = {
                darkMode: !!legacy.darkMode,
                activeIndex: 0,
                counters: [{
                    count: typeof legacy.count === "number" ? legacy.count : 10,
                    step: typeof legacy.step === "number" ? legacy.step : 1,
                    history: Array.isArray(legacy.history) ? legacy.history : [],
                    darkMode: !!legacy.darkMode,
                    label: "Counter 1",
                    auto: { enabled: false, speedMs: 1000 }
                }]
            };

            localStorage.removeItem(LEGACY_KEY);
        }
    }

    if (!data || !Array.isArray(data.counters) || data.counters.length === 0) {

        counters = [createCounter({ label: "Counter 1" })];
        activeIndex = 0;
        return;
    }

    counters = data.counters.map(s => createCounter(s)).slice(0, MAX_COUNTERS);
    activeIndex = Math.min(Math.max(0, data.activeIndex || 0), counters.length - 1);

    // Resume any counters that were auto-ticking
    counters.forEach((counter, i) => {
        if (counter.getState().auto.enabled) startInterval(i);
    });
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

            active().load({ count: data.count });

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
// MANUAL ACTIONS (active counter)
// ==========================================

function increase() {

    const state = active().increase();

    updateUI();
    bumpCounter();
    saveState();
    syncBackend(state.count);
}

function decrease() {

    const state = active().decrease();

    updateUI();
    bumpCounter();
    saveState();
    syncBackend(state.count);
}

function resetCounter() {

    const state = active().reset();

    updateUI();
    bumpCounter();
    saveState();
    syncBackend(state.count);
}

function changeStep() {

    const state = active().setStep(Number(stepSelect.value));

    updateUI();
    saveState();
}

function toggleDarkMode() {

    // Dark mode is global: keep every counter in sync
    const state = counters[0].toggleDarkMode();

    for (let i = 1; i < counters.length; i++) {
        counters[i].load({ darkMode: state.darkMode });
    }

    updateUI();
    saveState();
}


// ==========================================
// AUTO-TICK (per counter)
// ==========================================

function startInterval(index) {

    if (intervalIds[index] !== undefined) return;

    const speed = counters[index].getState().auto.speedMs || 1000;

    intervalIds[index] = setInterval(() => autoTickOnce(index), speed);
}

function stopInterval(index) {

    if (intervalIds[index] !== undefined) {

        clearInterval(intervalIds[index]);
        delete intervalIds[index];
    }
}

function autoTickOnce(index) {

    counters[index].tick();

    if (index === activeIndex) {
        updateUI();
    }

    saveState();
}

function toggleAutoTick() {

    const state = active().setAuto(
        !active().getState().auto.enabled,
        Number(autoSpeedSelect.value) || 1000
    );

    if (state.auto.enabled) {
        startInterval(activeIndex);
    } else {
        stopInterval(activeIndex);
    }

    updateUI();
    saveState();
}

function changeAutoSpeed() {

    const speed = Number(autoSpeedSelect.value) || 1000;

    active().setAuto(active().getState().auto.enabled, speed);

    if (active().getState().auto.enabled) {

        stopInterval(activeIndex);
        startInterval(activeIndex);
    }

    saveState();
}


// ==========================================
// BACKGROUND PICKER
// ==========================================

function heroSrc(url, width) {
    return url + "?auto=format&fit=crop&w=" + width + "&q=70";
}

function renderBgPicker() {

    const selected = localStorage.getItem(BG_KEY) || BACKGROUNDS[0].url;

    bgPicker.innerHTML = "";

    BACKGROUNDS.forEach((bg) => {

        const button = document.createElement("button");
        button.type = "button";
        button.className = "bg-thumb" + (bg.url === selected ? " bg-thumb--selected" : "");
        button.title = bg.label;
        button.setAttribute("aria-label", "Use " + bg.label + " background");
        button.dataset.url = bg.url;

        const img = document.createElement("img");
        img.src = heroSrc(bg.url, 240);
        img.alt = "";
        img.loading = "lazy";

        button.appendChild(img);
        bgPicker.appendChild(button);
    });
}

function setHeroImage(url) {

    // Crossfade: fade out, swap, fade back in on load
    heroImage.style.opacity = "0";

    heroImage.src = heroSrc(url, 1400);
    heroImage.srcset =
        heroSrc(url, 800) + " 800w, " +
        heroSrc(url, 1400) + " 1400w, " +
        heroSrc(url, 2000) + " 2000w";

    heroImage.onload = () => {
        heroImage.style.opacity = "1";
    };

    localStorage.setItem(BG_KEY, url);
    renderBgPicker();
}

function toggleBgPicker() {

    const isOpen = !bgPicker.hidden;

    bgPicker.hidden = isOpen;
    bgToggle.setAttribute("aria-expanded", String(!isOpen));
}

bgToggle.addEventListener("click", toggleBgPicker);

bgPicker.addEventListener("click", (event) => {

    const thumb = event.target.closest(".bg-thumb");
    if (!thumb || !thumb.dataset.url) return;

    setHeroImage(thumb.dataset.url);
    toggleBgPicker();
});


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

    const value = String(active().getState().count);

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

    // Left / Right = Switch counter
    if (event.key === "ArrowLeft") {
        switchTab(Math.max(0, activeIndex - 1));
    }

    if (event.key === "ArrowRight") {
        switchTab(Math.min(counters.length - 1, activeIndex + 1));
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

    // N = New counter
    if (event.key.toLowerCase() === "n") {
        addCounter();
    }

    // B = Background picker
    if (event.key.toLowerCase() === "b") {
        toggleBgPicker();
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

renderTabs();

renderBgPicker();

// Apply the saved background (defaults to Ocean)
const savedBg = localStorage.getItem(BG_KEY) || BACKGROUNDS[0].url;
setHeroImage(savedBg);

updateUI();

loadCounterFromBackend();
