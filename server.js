const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Allow Express to read JSON data
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Temporary counter stored in backend
let counter = 10;


// ==========================================
// GET API
// ==========================================

app.get("/api/counter", (req, res) => {
    res.json({
        count: counter,
        message: "Counter loaded successfully",
        status: "success"
    });
});


// ==========================================
// POST API
// ==========================================

app.post("/api/counter", (req, res) => {

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