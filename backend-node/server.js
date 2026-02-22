const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const sensorDataRoutes = require("./routes/sensorData");
const reportsPdfRouter = require("./routes/reports_pdf");
const { NeuroSyncAgent } = require("./agent");

const app = express();
const PORT = process.env.PORT || 5001;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" })); // larger limit for raw EEG batches

// ── Instantiate the LangGraph agent ─────────────────────────
const agent = new NeuroSyncAgent(io);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "Node/Express backend is running!" });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Sensor data routes (EEG telemetry from Flask stream processor → MongoDB)
app.use("/api/sensor-data", sensorDataRoutes);

// Reports PDF generation route
app.use("/api/reports", reportsPdfRouter);

// Agentic core endpoint (placeholder for Flask backend to trigger)
app.post("/api/agent/trigger", (req, res) => {
  console.log("🔥 Cognitive shift event received:", req.body);
  res.json({ status: "Event received", data: req.body });
});

// Raw EEG relay — stream_processor POSTs batches here, Node broadcasts via WebSocket
app.post("/api/eeg-raw", (req, res) => {
  const { samples } = req.body; // array of [tp9, af7, af8, tp10] arrays
  if (samples && samples.length) {
    io.emit("eeg:data", samples);
  }
  res.sendStatus(200);
});

// ── Socket.IO connection handling ───────────────────────────
io.on("connection", (socket) => {
  const role = socket.handshake.auth?.role || "frontend";
  console.log(`🔌 ${role} client connected: ${socket.id}`);

  // Streamer sends ml:data events (1 Hz telemetry)
  if (role === "streamer") {
    socket.on("ml:data", (point) => {
      agent.ingest(point);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Streamer disconnected: ${socket.id}`);
      agent.stop();
      // Notify frontends that the ML stream stopped
      io.emit("ml:stopped");
    });
  } else {
    socket.on("disconnect", () => {
      console.log(`🔌 Frontend client disconnected: ${socket.id}`);
    });
  }
});

server.listen(PORT, () => {
  console.log(`Node server running on http://localhost:${PORT}`);
});
