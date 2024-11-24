const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const HospitalScheduler = require("./scheduler");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the "frontend" directory
app.use(express.static(path.join(__dirname, "../frontend")));

// Root route to render index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Scheduler API
app.post("/schedule", (req, res) => {
    try {
        const { patients, doctors, rooms } = req.body;

        if (!patients || !doctors || !rooms) {
            return res.status(400).json({ error: "Missing required data: patients, doctors, or rooms" });
        }

        const scheduler = new HospitalScheduler(doctors, rooms);
        const schedule = scheduler.allocateResources(patients);
        const report = scheduler.generateReport();

        res.json({ schedule, report });
    } catch (error) {
        console.error("Error in /schedule API:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
