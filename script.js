// ==========================================
// SMART COUNTER
// ==========================================

// Counter state
let state = {
    count: 10,
    step: 1,
    history: [],
    darkMode: false
};


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


// ==========================================
// UPDATE UI
// ==========================================

function updateUI() {

    counterDisplay.textContent = state.count;

    // Counter message
    if (state.count === 0) {
        messageDisplay.textContent = "Minimum counter limit reached (0).";
    } else {
        messageDisplay.textContent = "Ready";
    }

    // Disable decrease at 0
    if (state.count <= 0) {
        decreaseBtn.disabled = true;
    } else {
        decreaseBtn.disabled = false;
    }

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
}


// ==========================================
// UPDATE HISTORY
// ==========================================

function updateHistory() {

    if (state.history.length === 0) {
        historyList.innerHTML = `
            <p class="empty-history">
                No actions recorded yet.
            </p>
        `;

        return;
    }

    historyList.innerHTML = state.history
        .map(item => `<p>${item}</p>`)
        .join("");
}


// ==========================================
// ADD HISTORY
// ==========================================

function addHistory(action) {

    state.history.unshift(action);

    // Keep only latest 10 actions
    if (state.history.length > 10) {
        state.history.pop();
    }

    saveState();
    updateHistory();
}


// ==========================================
// INCREASE
// ==========================================

async function increase() {

    state.count += state.step;

    addHistory(`➕ Increased by ${state.step} → ${state.count}`);

    updateUI();
    saveState();


    // Send updated counter to backend
    try {

        const response = await fetch("/api/counter", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                count: state.count
            })
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


// ==========================================
// DECREASE
// ==========================================

async function decrease() {

    if (state.count <= 0) {
        return;
    }

    state.count -= state.step;

    // Prevent negative values
    if (state.count < 0) {
        state.count = 0;
    }

    addHistory(`➖ Decreased by ${state.step} → ${state.count}`);

    updateUI();
    saveState();


    // Send updated counter to backend
    try {

        const response = await fetch("/api/counter", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                count: state.count
            })
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


// ==========================================
// RESET
// ==========================================

async function resetCounter() {

    state.count = 0;

    addHistory("🔄 Counter reset → 0");

    updateUI();
    saveState();


    // Send reset value to backend
    try {

        const response = await fetch("/api/counter", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                count: 0
            })
        });


        const data = await response.json();

        console.log("Backend response:", data);


    } catch (error) {

        console.error(
            "Error sending reset to backend:",
            error
        );
    }
}


// ==========================================
// CHANGE STEP
// ==========================================

function changeStep() {

    state.step = Number(stepSelect.value);

    addHistory(`⚙️ Step changed → ${state.step}`);

    updateUI();
    saveState();
}


// ==========================================
// DARK MODE
// ==========================================

function toggleDarkMode() {

    state.darkMode = !state.darkMode;

    addHistory(
        state.darkMode
            ? "🌙 Dark mode enabled"
            : "☀️ Light mode enabled"
    );

    updateUI();
    saveState();
}


// ==========================================
// LOCAL STORAGE
// ==========================================

function saveState() {

    localStorage.setItem(
        "smartCounterState",
        JSON.stringify(state)
    );
}


// ==========================================
// LOAD LOCAL STORAGE
// ==========================================

function loadState() {

    const savedState =
        localStorage.getItem("smartCounterState");

    if (savedState) {

        state = JSON.parse(savedState);
    }
}


// ==========================================
// LOAD COUNTER FROM BACKEND
// ==========================================

async function loadCounterFromBackend() {

    try {

        const response =
            await fetch("/api/counter");

        const data =
            await response.json();

        console.log(
            "Counter loaded from backend:",
            data
        );

        if (typeof data.count === "number") {

            state.count = data.count;

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
});


// ==========================================
// EVENT LISTENERS
// ==========================================

increaseBtn.addEventListener(
    "click",
    increase
);

decreaseBtn.addEventListener(
    "click",
    decrease
);

resetBtn.addEventListener(
    "click",
    resetCounter
);

darkModeBtn.addEventListener(
    "click",
    toggleDarkMode
);

stepSelect.addEventListener(
    "change",
    changeStep
);


// ==========================================
// START APPLICATION
// ==========================================

loadState();

updateUI();

loadCounterFromBackend();