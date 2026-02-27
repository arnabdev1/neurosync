"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const NODE_URL = "http://localhost:5001";
const CHANNELS = ["TP9", "AF7", "AF8", "TP10"];
const CHANNEL_COLORS = ["#a855f7", "#ec4899", "#06b6d4", "#22c55e"];
const MAX_POINTS = 320; // ~5 seconds at 64 Hz

// Fixed Y-axis range — Muse raw EEG typically ≈ 800-900 µV
const Y_CENTER = 250;   // µV center
const Y_HALF   = 1000;   // ±500 µV around center → total 1000 µV window
const Y_MIN    = Y_CENTER - Y_HALF;  // -750
const Y_MAX    = Y_CENTER + Y_HALF;  // 1250

// Focus detection thresholds (µV) — if any channel goes outside this range → "Focused"
const FOCUS_LOW  = -150;
const FOCUS_HIGH = 200;
const FOCUS_HOLD_MS = 2000; // hold "Focused" for 2 seconds after last exceedance

interface LiveEEGChartProps {
  isConnected: boolean;
  onFocusChange?: (focused: boolean) => void;
}

export default function LiveEEGChart({ isConnected, onFocusChange }: LiveEEGChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[][]>([]); // array of [tp9, af7, af8, tp10]
  const socketRef = useRef<Socket | null>(null);
  const animFrameRef = useRef<number>(0);
  const [activeChannels, setActiveChannels] = useState([true, true, true, true]);
  const lastExceedRef = useRef<number>(0);
  const focusedRef = useRef<boolean>(false);
  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;

  // Connect / disconnect WebSocket based on stream status
  useEffect(() => {
    if (!isConnected) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      dataRef.current = [];
      return;
    }

    const socket = io(NODE_URL, { transports: ["polling", "websocket"] });
    socketRef.current = socket;

    socket.on("eeg:data", (samples: number[][]) => {
      const buf = dataRef.current;
      for (const sample of samples) {
        buf.push(sample);

        // Focus detection: check if any channel exceeds thresholds
        const exceeds = sample.some(
          (v) => v < FOCUS_LOW || v > FOCUS_HIGH
        );
        if (exceeds) {
          lastExceedRef.current = Date.now();
          if (!focusedRef.current) {
            focusedRef.current = true;
            onFocusChangeRef.current?.(true);
          }
        } else if (focusedRef.current && Date.now() - lastExceedRef.current > FOCUS_HOLD_MS) {
          focusedRef.current = false;
          onFocusChangeRef.current?.(false);
        }
      }
      // Keep only the last MAX_POINTS
      if (buf.length > MAX_POINTS) {
        dataRef.current = buf.slice(buf.length - MAX_POINTS);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isConnected]);

  // Canvas draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const data = dataRef.current;

    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Vertical grid lines (in plot area only)
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const LEFT_M = 48;
    const gridCols = 10;
    for (let i = 0; i <= gridCols; i++) {
      const x = LEFT_M + ((W - LEFT_M) / gridCols) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    if (data.length < 2) {
      // "Waiting for data" text
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "14px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        isConnected ? "Waiting for EEG data…" : "Connect Muse to start",
        W / 2,
        H / 2
      );
      animFrameRef.current = requestAnimationFrame(draw);
      return;
    }

    // Fixed Y-axis: Y_MIN to Y_MAX — data outside this range clips at edges
    const LEFT_MARGIN = 48; // space for Y-axis labels
    const plotW = W - LEFT_MARGIN;

    // Draw Y-axis tick labels
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "10px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = Y_MIN + (Y_MAX - Y_MIN) * (i / yTicks);
      const y = H - (i / yTicks) * H;
      ctx.fillText(`${Math.round(val)}`, LEFT_MARGIN - 6, y + 3);
      // tick grid line
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(LEFT_MARGIN, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // µV label
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "9px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.translate(10, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("µV", 0, 0);
    ctx.restore();

    // Draw each channel with fixed scale (clipping at canvas edges)
    const xStep = plotW / (MAX_POINTS - 1);

    for (let ch = 0; ch < 4; ch++) {
      if (!activeChannels[ch]) continue;

      ctx.strokeStyle = CHANNEL_COLORS[ch];
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const startIdx = MAX_POINTS - data.length;
      for (let i = 0; i < data.length; i++) {
        const x = LEFT_MARGIN + (startIdx + i) * xStep;
        const normalized = (data[i][ch] - Y_MIN) / (Y_MAX - Y_MIN);
        const y = H - normalized * H; // values outside 0–1 will draw beyond canvas bounds

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Channel labels (top-left, after margin)
    ctx.font = "bold 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    for (let ch = 0; ch < 4; ch++) {
      if (!activeChannels[ch]) continue;
      ctx.fillStyle = CHANNEL_COLORS[ch];
      ctx.fillText(CHANNELS[ch], LEFT_MARGIN + 8, 16 + ch * 16);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [isConnected, activeChannels]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const toggleChannel = (idx: number) => {
    setActiveChannels((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 col-span-1 lg:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-zinc-400">Live EEG Stream</h3>
        <div className="flex items-center gap-2">
          {CHANNELS.map((name, i) => (
            <button
              key={name}
              onClick={() => toggleChannel(i)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                activeChannels[i]
                  ? "border-white/20 text-white"
                  : "border-white/5 text-zinc-600"
              }`}
              style={{
                backgroundColor: activeChannels[i]
                  ? CHANNEL_COLORS[i] + "22"
                  : "transparent",
                color: activeChannels[i] ? CHANNEL_COLORS[i] : undefined,
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        style={{ height: 220 }}
      />
    </div>
  );
}
