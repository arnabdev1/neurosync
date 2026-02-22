"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import LiveEEGChart from "@/components/LiveEEGChart";
import DailyReportButton from "@/components/DailyReportButton";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Available session dates
const SESSION_DATES = ["2026-02-22", "2026-02-21"];

const EMPTY_24H = Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00` }));

const weekdayData = [
  { day: "Mon", change: 0 },
  { day: "Tue", change: 0 },
  { day: "Wed", change: 0 },
  { day: "Thu", change: 0 },
  { day: "Fri", change: 0 },
  { day: "Sat", change: -30 },
  { day: "Sun", change: -10 },
];

const AGENT_DEFAULT =
  "Waiting for the first agent analysis… The AI will provide its first insight after 1 minute of streaming data.";

function TypewriterText({
  text,
  onDone,
}: {
  text: string;
  onDone?: () => void;
}) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);
  const prevText = useRef(text);

  useEffect(() => {
    // Reset when text changes
    if (text !== prevText.current) {
      prevText.current = text;
      setDisplay("");
      setDone(false);
    }
  }, [text]);

  useEffect(() => {
    if (done) return;
    let i = 0;
    const t = setInterval(() => {
      if (i < text.length) {
        setDisplay(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        onDone?.();
        clearInterval(t);
      }
    }, 20);
    return () => clearInterval(t);
  }, [text, done, onDone]);

  return (
    <p className="text-zinc-100/90 leading-relaxed text-[15px]">
      {display}
      {!done && <span className="animate-pulse">|</span>}
    </p>
  );
}


const FLASK_URL = "http://localhost:5002";

export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [streamStatus, setStreamStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  // Date-driven graph data
  const [selectedDate, setSelectedDate] = useState(SESSION_DATES[0]);
  const [heartRateData, setHeartRateData] = useState(EMPTY_24H);
  const [eegData, setEegData] = useState(EMPTY_24H);
  const [focusData, setFocusData] = useState(EMPTY_24H);

  useEffect(() => {
    fetch(`/data/${selectedDate}.json`)
      .then((r) => r.json())
      .then((d) => {
        setHeartRateData(d.heartRate);
        setEegData(d.eeg);
        setFocusData(d.focus);
      })
      .catch(() => {
        setHeartRateData(EMPTY_24H);
        setEegData(EMPTY_24H);
        setFocusData(EMPTY_24H);
      });
  }, [selectedDate]);

  // Agent / ML stream state
  const [agentText, setAgentText] = useState(AGENT_DEFAULT);
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [mlStreaming, setMlStreaming] = useState(false);
  const agentSocketRef = useRef<Socket | null>(null);

  const NODE_URL = "http://localhost:5001";

  // Socket.IO connection for agent events (ml:live, agent_update, ml:stopped)
  useEffect(() => {
    const socket = io(NODE_URL, { transports: ["polling", "websocket"] });
    agentSocketRef.current = socket;

    socket.on("ml:live", (point: { app_used: string; elapsed_seconds: number }) => {
      setActiveApp(point.app_used);
      setMlStreaming(true);
    });

    socket.on("agent_update", (payload: { text: string }) => {
      setAgentText(payload.text);
    });

    socket.on("ml:stopped", () => {
      setMlStreaming(false);
      setActiveApp(null);
    });

    return () => {
      socket.disconnect();
      agentSocketRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Give a moment for auth context to initialize
    const timer = setTimeout(() => setIsChecking(false), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isChecking && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, isChecking, router]);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const daysInFeb2026 = 28;
  const startDay = 0; // Sunday
  const reportByDay: Record<number, string[]> = {
    21: ["daily_report_02212026.pdf"],
  };

  // Poll Flask stream status every 2 seconds
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`${FLASK_URL}/api/stream/status`);
        if (!alive) return;
        const data = await res.json();
        setStreamStatus(data.status);
        setStreamError(data.error || null);
      } catch {
        // Flask not running — treat as disconnected
        if (alive) setStreamStatus("disconnected");
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const handleConnect = async () => {
    try {
      setStreamStatus("connecting");
      setStreamError(null);
      await fetch(`${FLASK_URL}/api/stream/start`, { method: "POST" });
      // status will update via polling
    } catch {
      setStreamStatus("error");
      setStreamError("Could not reach Flask backend");
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${FLASK_URL}/api/stream/stop`, { method: "POST" });
    } catch {
      // polling will correct the status
    }
  };

  const calendarDays = Array.from({ length: daysInFeb2026 }, (_, i) => i + 1);

  if (isChecking || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <main className="pt-24 px-4 pb-16 max-w-7xl mx-auto page-enter">
        <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-8">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">
            Hardware Connection
          </h3>
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full transition-colors ${
                streamStatus === "connected"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  : streamStatus === "connecting"
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse"
                    : streamStatus === "error"
                      ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                      : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              }`}
            />
            <span className="text-white font-medium capitalize">
              {streamStatus === "connecting" ? "Connecting…" : streamStatus}
            </span>

            {streamStatus === "disconnected" || streamStatus === "error" ? (
              <button
                onClick={handleConnect}
                className="ml-2 px-4 py-1.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                Connect
              </button>
            ) : streamStatus === "connected" ? (
              <button
                onClick={handleDisconnect}
                className="ml-2 px-4 py-1.5 rounded-lg text-sm font-semibold bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <span className="ml-2 text-xs text-amber-300 animate-pulse">
                Searching for Muse…
              </span>
            )}

            {streamStatus === "connected" && (
              <div
                className={`ml-4 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all duration-300 ${isFocused ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "border-red-400/30 bg-red-500/10 text-red-300"}`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${isFocused ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" : "bg-red-400"}`}
                />
                {isFocused ? "Focused" : "Not Focused"}
              </div>
            )}
          </div>
          {streamError && (
            <p className="mt-2 text-xs text-red-400">{streamError}</p>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-200">Session Graphs</h2>
          <select
            title="Select session date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#151525] px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            {SESSION_DATES.map((d) => (
              <option key={d} value={d}>
                {new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <LiveEEGChart isConnected={streamStatus === "connected"} onFocusChange={setIsFocused} />
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">
              Heart Rate
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={heartRateData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="bpm"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">
              EEG Frequency
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={eegData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="alpha"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  dot={false}
                  name="Alpha"
                />
                <Line
                  type="monotone"
                  dataKey="beta"
                  stroke="#ec4899"
                  strokeWidth={1.5}
                  dot={false}
                  name="Beta"
                />
                <Line
                  type="monotone"
                  dataKey="theta"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  dot={false}
                  name="Theta"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">
              Focus Level
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={focusData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Area
                  type="monotone"
                  dataKey="focus"
                  stroke="#a855f7"
                  fill="rgba(168,85,247,0.3)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">
              Focus Change by Weekday
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={weekdayData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="day" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar
                  dataKey="change"
                  fill="#a855f7"
                  radius={[4, 4, 0, 0]}
                  name="Focus %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active App + Agent Last Action — side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 mb-8">
          {/* Currently Used App Widget */}
          <div className="rounded-2xl border border-white/10 bg-[#0f0f16] p-5 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
              Active App
            </p>
            {mlStreaming && activeApp ? (
              <>
                {/* Reddit icon */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(249,115,22,0.35)]">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-sm">{activeApp}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-emerald-300">
                    Streaming
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-zinc-600">
                    <path d="M18.364 5.636a1 1 0 0 0-1.414 0L12 10.586 7.05 5.636a1 1 0 1 0-1.414 1.414L10.586 12l-4.95 4.95a1 1 0 1 0 1.414 1.414L12 13.414l4.95 4.95a1 1 0 0 0 1.414-1.414L13.414 12l4.95-4.95a1 1 0 0 0 0-1.414z" />
                  </svg>
                </div>
                <p className="text-zinc-500 font-medium text-sm">None</p>
                <span className="text-[11px] text-zinc-600 mt-1">
                  No active stream
                </span>
              </>
            )}
          </div>

          {/* Agent Last Action + Countdown */}
          <div className="rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 via-indigo-500/15 to-cyan-500/10 p-6 shadow-[0_20px_40px_-20px_rgba(168,85,247,0.55)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
              <h3 className="text-sm font-semibold tracking-wide text-purple-100 uppercase">
                Agent Last Action
              </h3>
            </div>
            <TypewriterText text={agentText} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0f0f16] p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-300">Daily Reports</h3>
            <DailyReportButton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
            <div className="rounded-xl border border-white/10 bg-[#151525] p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-zinc-100">
                  February 2026
                </p>
                <span className="text-xs text-zinc-500">Monthly view</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="text-[11px] text-zinc-500 font-medium py-1"
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: startDay }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {calendarDays.map((d) => (
                  <button
                    key={d}
                    onClick={() =>
                      setCalendarDate(
                        calendarDate?.getDate() === d
                          ? null
                          : new Date(2026, 1, d),
                      )
                    }
                    className={`h-9 rounded-md text-sm font-medium transition-colors ${
                      calendarDate?.getDate() === d
                        ? "bg-indigo-500 text-white"
                        : reportByDay[d]
                          ? "text-zinc-100 bg-white/5 hover:bg-white/10"
                          : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#14141f] p-4 min-h-[270px]">
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">
                Reports
              </p>
              {calendarDate ? (
                <>
                  <p className="text-sm text-zinc-300 mb-3">
                    {calendarDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <div className="space-y-2">
                    {(reportByDay[calendarDate.getDate()] ?? []).length > 0 ? (
                      reportByDay[calendarDate.getDate()].map((report) => (
                        <a
                          key={report}
                          href={`/${report}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:border-indigo-400/60 hover:bg-indigo-500/10 transition-colors"
                        >
                          <span>{report}</span>
                          <span className="text-indigo-300">↗</span>
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">
                        No reports for this day.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500">
                  Select a date to view reports.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
