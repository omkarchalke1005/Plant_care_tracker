const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5500;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Minimal backend health endpoint.
app.get("/api/health", function (_req, res) {
  res.status(200).json({
    ok: true,
    service: "plant-care-tracker-backend",
    timestamp: new Date().toISOString()
  });
});

// Serve the existing frontend app from /FRONTEND.
const frontendDir = path.resolve(__dirname, "..", "FRONTEND");
app.use(express.static(frontendDir));

// Keep compatibility for direct /BACKEND route usage.
app.get("/backend", function (_req, res) {
  res.redirect("/");
});

// Fallback to the frontend entry file.
app.get("*", function (_req, res) {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.listen(PORT, function () {
  // eslint-disable-next-line no-console
  console.log("Plant Care Tracker backend running on http://localhost:" + PORT);
});
