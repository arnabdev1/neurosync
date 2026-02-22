"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

/* ─── types ──────────────────────────────────────────────────────────── */
type ChatMessage = {
  id: number;
  role: "agent" | "user";
  content: string;
  time: string;
};

type AnalysisResult = {
  escalate: boolean;
  reason: string;
  alertEmail: string | null;
};

/* ─── constants ──────────────────────────────────────────────────────── */
const OPENING_GREETING =
  "Hey Arnab — this is your daily triage check-in. I've been watching your BCI telemetry, and there are a few patterns I'd like to walk through with you. How are you feeling right now?";

/* ─── page ───────────────────────────────────────────────────────────── */
export default function TriagePage() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "agent",
      content: OPENING_GREETING,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [isReplying, setIsReplying] = useState(false);
  const [phase, setPhase] = useState<
    "chat" | "analyzing" | "result"
  >("chat");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isReplying, phase]);

  /* ── send a message (Stage 1 — Qwen streaming) ────────────────── */
  const sendMessage = async () => {
    const value = draft.trim();
    if (!value || isReplying || phase !== "chat") return;

    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: value,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setIsReplying(true);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.content,
    }));

    const replyId = Date.now() + 1;

    try {
      const res = await fetch("/api/triage/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);

      setMessages((prev) => [
        ...prev,
        {
          id: replyId,
          role: "agent",
          content: "",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(chunk, { stream: true });
        const current = accumulated;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId ? { ...m, content: current } : m
          )
        );
      }
    } catch (err) {
      console.error("Triage chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: replyId,
          role: "agent",
          content: "Sorry, something went wrong. Please try again.",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsReplying(false);
    }
  };

  /* ── end session → Stage 2 + 3 ────────────────────────────────── */
  const endSession = async () => {
    setPhase("analyzing");

    const transcript = messages.map((m) => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.content,
    }));

    try {
      const res = await fetch("/api/triage/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: transcript }),
      });

      if (!res.ok) throw new Error(`Analyze error: ${res.status}`);
      const data: AnalysisResult = await res.json();
      setAnalysis(data);
    } catch (err) {
      console.error("Triage analyze error:", err);
      setAnalysis({
        escalate: false,
        reason: "Analysis failed — please try again later.",
        alertEmail: null,
      });
    } finally {
      setPhase("result");
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage();
  };

  /* ── render ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <main className="pt-20 px-3 sm:px-4 pb-4 h-[calc(100vh-4rem)] max-w-7xl mx-auto">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          {/* ── sidebar ─────────────────────────────────────────── */}
          <aside className="rounded-2xl border border-white/10 bg-[#11111a] p-5 hidden lg:flex flex-col">
            <div className="rounded-xl bg-[#1a1a29] border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Triage Channel
              </p>
              <h2 className="text-white text-lg font-semibold mt-2">
                Daily Check-In
              </h2>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                3-stage mixture-of-agents pipeline: Qwen interviewer &rarr;
                DeepSeek diagnostician &rarr; Llama scribe.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 p-4 bg-white/3">
              <p className="text-zinc-300 text-sm font-medium">
                Pipeline Status
              </p>
              <div className="mt-2 space-y-1.5 text-xs">
                <StatusRow
                  label="Stage 1 — Interview"
                  active={phase === "chat"}
                  done={phase !== "chat"}
                />
                <StatusRow
                  label="Stage 2 — Diagnosis"
                  active={phase === "analyzing"}
                  done={phase === "result"}
                />
                <StatusRow
                  label="Stage 3 — Alert"
                  active={false}
                  done={phase === "result" && !!analysis?.escalate}
                />
              </div>
            </div>

            <div className="mt-auto text-xs text-zinc-500">
              Powered by Featherless.ai multi-model routing.
            </div>
          </aside>

          {/* ── main panel ──────────────────────────────────────── */}
          <section className="rounded-2xl border border-white/10 bg-[#11111a] flex flex-col overflow-hidden">
            {/* header */}
            <div className="border-b border-white/10 px-4 sm:px-6 py-4 bg-[#151523] flex items-center justify-between">
              <div>
                <h1 className="text-white text-lg sm:text-xl font-semibold">
                  Daily Triage Check-In
                </h1>
                <p className="text-zinc-400 text-sm">
                  5-minute trend &amp; anomaly review
                </p>
              </div>
              {phase === "chat" && messages.length >= 3 && (
                <button
                  onClick={endSession}
                  disabled={isReplying}
                  className="rounded-xl bg-red-600/80 hover:bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  End Session &amp; Analyze
                </button>
              )}
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-3 border ${
                        isUser
                          ? "bg-[#2b1159] border-purple-400/30 text-white"
                          : "bg-[#1a1a29] border-white/10 text-zinc-100"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <p className="text-[11px] mt-2 text-zinc-400">
                        {msg.time}
                      </p>
                    </div>
                  </div>
                );
              })}

              {isReplying && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 border border-white/10 bg-[#1a1a29] text-zinc-300 text-sm">
                    Typing...
                  </div>
                </div>
              )}

              {/* ── analyzing spinner ────────────────────────────── */}
              {phase === "analyzing" && (
                <div className="flex justify-center py-8">
                  <div className="text-center space-y-3">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                    <p className="text-sm text-zinc-300">
                      Running diagnostic pipeline&hellip;
                    </p>
                    <p className="text-xs text-zinc-500">
                      Stage 2: DeepSeek-V3 analysing transcript
                    </p>
                  </div>
                </div>
              )}

              {/* ── result card ──────────────────────────────────── */}
              {phase === "result" && analysis && (
                <div className="space-y-4 py-4">
                  {/* diagnosis summary */}
                  <div
                    className={`rounded-2xl border p-5 ${
                      analysis.escalate
                        ? "border-red-400/40 bg-red-950/30"
                        : "border-emerald-400/30 bg-emerald-950/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          analysis.escalate ? "bg-red-400" : "bg-emerald-400"
                        }`}
                      />
                      <p className="text-sm font-semibold text-white">
                        {analysis.escalate
                          ? "Escalation Triggered"
                          : "No Escalation Needed"}
                      </p>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {analysis.reason}
                    </p>
                  </div>

                  {/* alert email (Stage 3) */}
                  {analysis.escalate && analysis.alertEmail && (
                    <div className="rounded-2xl border border-orange-400/30 bg-orange-950/20 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400 animate-pulse" />
                        <p className="text-sm font-semibold text-white">
                          Alert Dispatched to Dr. Maliha Rahman
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                        <p className="text-xs uppercase tracking-widest text-orange-300 mb-2">
                          Generated Email Preview
                        </p>
                        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                          {analysis.alertEmail}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* back link */}
                  <div className="flex justify-center pt-2">
                    <Link
                      href="/ai-sessions"
                      className="rounded-xl bg-[#2b1159] px-6 py-3 text-sm font-medium text-white hover:bg-[#3a1b78] transition-colors"
                    >
                      Back to AI Sessions
                    </Link>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── input bar (hidden after chat ends) ──────────── */}
            {phase === "chat" && (
              <form
                onSubmit={onSubmit}
                className="border-t border-white/10 p-3 sm:p-4 bg-[#151523]"
              >
                <div className="flex items-center gap-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Reply to triage agent..."
                    className="flex-1 rounded-xl border border-white/10 bg-[#0f0f18] px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || isReplying}
                    className="rounded-xl bg-[#2b1159] px-5 py-3 text-sm font-medium text-white hover:bg-[#3a1b78] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/* ─── helper ──────────────────────────────────────────────────────────── */
function StatusRow({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${
          done
            ? "bg-emerald-400"
            : active
              ? "bg-yellow-400 animate-pulse"
              : "bg-zinc-600"
        }`}
      />
      <span className={done ? "text-zinc-300" : active ? "text-yellow-300" : "text-zinc-500"}>
        {label}
      </span>
    </div>
  );
}
