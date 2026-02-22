"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";

type ChatMessage = {
  id: number;
  role: "agent" | "user";
  content: string;
  time: string;
};

export default function AgentChatPage() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "agent",
      content:
        "Hi, I’m Dr. NeuroSync, your cognitive support assistant. I’m here to help with ADHD-friendly focus planning, workload pacing, and burnout prevention through structured guidance.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isReplying, setIsReplying] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isReplying]);

  const sendMessage = async () => {
    const value = draft.trim();
    if (!value || isReplying) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: value,
      time: now,
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setIsReplying(true);

    // Build conversation history for the API (map agent → assistant)
    const history = [...messages, userMessage].map((m) => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.content,
    }));

    const replyId = Date.now() + 1;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`API error: ${res.status}`);
      }

      // Add an empty agent message that we'll stream into
      setMessages((prev) => [
        ...prev,
        {
          id: replyId,
          role: "agent",
          content: "",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
          prev.map((m) => (m.id === replyId ? { ...m, content: current } : m))
        );
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: replyId,
          role: "agent",
          content: "Sorry, something went wrong. Please try again.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsReplying(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <main className="pt-20 px-3 sm:px-4 pb-4 h-[calc(100vh-4rem)] max-w-7xl mx-auto">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          <aside className="rounded-2xl border border-white/10 bg-[#11111a] p-5 hidden lg:flex flex-col">
            <div className="rounded-xl bg-[#1a1a29] border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Care Channel</p>
              <h2 className="text-white text-lg font-semibold mt-2">Dr. NeuroSync</h2>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                Clinical-style ADHD coaching assistant for focus stabilization, pacing, and cognitive
                recovery.
              </p>
            </div>
            <div className="mt-5 rounded-xl border border-white/10 p-4 bg-white/3">
              <p className="text-zinc-300 text-sm font-medium">Session mode</p>
              <p className="text-zinc-500 text-xs mt-1">Support simulation (UI preview)</p>
            </div>
            <div className="mt-auto text-xs text-zinc-500">
              Future API integration will connect this chat to live NeuroSync agent actions.
            </div>
          </aside>

          <section className="rounded-2xl border border-white/10 bg-[#11111a] flex flex-col overflow-hidden">
            <div className="border-b border-white/10 px-4 sm:px-6 py-4 bg-[#151523]">
              <h1 className="text-white text-lg sm:text-xl font-semibold">Agent Chat</h1>
              <p className="text-zinc-400 text-sm">Messenger-style ADHD support conversation</p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-3 border ${
                        isUser
                          ? "bg-[#2b1159] border-purple-400/30 text-white"
                          : "bg-[#1a1a29] border-white/10 text-zinc-100"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p className="text-[11px] mt-2 text-zinc-400">{message.time}</p>
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
              <div ref={bottomRef} />
            </div>

            <form onSubmit={onSubmit} className="border-t border-white/10 p-3 sm:p-4 bg-[#151523]">
              <div className="flex items-center gap-3">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Message Dr. NeuroSync..."
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
          </section>
        </div>
      </main>
    </div>
  );
}
