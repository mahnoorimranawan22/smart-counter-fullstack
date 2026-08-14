const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Base path the app is served at (e.g. /smartcalc-pro).
// The app is mounted at both the root and this subpath so it
// works at "/" and at "/smartcalc-pro/" regardless of how the
// hosting setup forwards requests.
const APP_BASE = "/smartcalc-pro";

// Directory containing the frontend files
const staticDir = path.join(__dirname);

// Allow Express to read JSON data
app.use(express.json());

// Serve frontend files (index.html, style.css, script.js)
app.use(express.static(staticDir));
app.use(APP_BASE, express.static(staticDir));

// Temporary counter stored in backend
let counter = 10;

// Routes are registered at both the root and the subpath
const counterRoutes = ["/api/counter", `${APP_BASE}/api/counter`];


// ==========================================
// GET API
// ==========================================

app.get(counterRoutes, (req, res) => {
    res.json({
        count: counter,
        message: "Counter loaded successfully",
        status: "success"
    });
});


// ==========================================
// POST API
// ==========================================

app.post(counterRoutes, (req, res) => {

    const { count } = req.body;

    console.log("Received from frontend:", count);

    if (typeof count !== "number") {

        return res.status(400).json({
            message: "Count must be a number",
            status: "error"
        });
    }

    counter = count;

    res.json({
        count: counter,
        message: "Counter updated successfully",
        status: "success"
    });
});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});