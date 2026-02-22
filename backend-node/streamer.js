/**
 * streamer.js — ML Stream Simulator
 *
 * Reads ml_results/ml_output.json (3600 data points = 1 hour at 1Hz)
 * and emits one JSON object per second to the Node backend via Socket.IO.
 *
 * Usage:  node streamer.js
 * Stop:   Ctrl+C
 */

const { io } = require("socket.io-client");
const fs = require("fs");
const path = require("path");

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5001";
const DATA_FILE = path.join(__dirname, "ml_results", "ml_output.json");

// ── Load data ───────────────────────────────────────────────
let data;
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  console.log(`📂 Loaded ${data.length} data points from ml_output.json`);
} catch (err) {
  console.error("❌ Could not read ml_output.json:", err.message);
  process.exit(1);
}

// ── Connect to Node backend ─────────────────────────────────
const socket = io(SERVER_URL, {
  transports: ["polling", "websocket"],
  auth: { role: "streamer" },          // lets the server identify this client
});

socket.on("connect", () => {
  console.log(`🔌 Connected to backend (socket ${socket.id})`);
  startStreaming();
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection failed:", err.message);
});

socket.on("disconnect", (reason) => {
  console.log(`\n🔌 Disconnected: ${reason}`);
  // Stop the timer so we don't stack intervals on reconnect
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});

// ── Stream one object per second ────────────────────────────
let idx = 0;
let timer = null;

function startStreaming() {
  // Guard: clear any existing timer to prevent stacking
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  console.log("▶  Streaming started (1 data-point / second)…\n");
  timer = setInterval(() => {
    if (idx >= data.length) {
      console.log("\n✅ All data points sent. Stopping.");
      clearInterval(timer);
      socket.disconnect();
      process.exit(0);
    }

    const point = data[idx];
    socket.emit("ml:data", point);

    // Compact progress line
    const mins = Math.floor(point.elapsed_seconds / 60);
    const secs = point.elapsed_seconds % 60;
    const ts = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    process.stdout.write(
      `\r  [${ts}]  idx=${idx}  focus=${point.metrics.focus_score}  ` +
      `stress=${point.metrics.stress_level}  state=${point.cognitive_state}  ` +
      `app=${point.app_used}`
    );

    idx++;
  }, 1000);
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n⏹  Streamer stopped by user.");
  if (timer) clearInterval(timer);
  socket.disconnect();
  process.exit(0);
});
