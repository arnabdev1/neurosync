"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";

type SessionType = "appointment" | "medication" | "urgent" | "smart-alert";

type SessionItem = {
  id: string;
  type: SessionType;
  title: string;
  timestamp: string;
  message?: string;
  transcriptPreview?: string;
  note?: string;
};

type SessionGroup = {
  monthYear: string;
  sessions: SessionItem[];
};

const sessionGroups: SessionGroup[] = [
  {
    monthYear: "February 2026",
    sessions: [
      {
        id: "feb-1",
        type: "appointment",
        title: "Reminder to schedule an appointment with Dr. Maliha Rahman.",
        timestamp: "Feb 18, 2026 • 09:12 AM",
        message:
          "Based on your biometric history and recent focus drops, the Featherless AI agent suggests a follow-up. Click here to schedule.",
      },
      {
        id: "feb-2",
        type: "medication",
        title: "Medication & Hydration Reminder",
        timestamp: "Feb 14, 2026 • 02:34 PM",
        message:
          "This reminder was triggered after a measured drop in your cognitive focus score and hydration confidence index.",
      },
      {
        id: "feb-3",
        type: "urgent",
        title: "Daily Check-In: 5-Minute Trend & Anomaly Review",
        timestamp: "Feb 07, 2026 • 11:48 AM",
        transcriptPreview:
          "Good morning. Let's do a quick 5-minute review of your week so far — I want to flag any missed patterns or emerging trends before they escalate...",
        note: "This daily check-in scans for missed alerts, emerging cognitive fatigue trends, and anomalies in your biometric baselines. Results feed directly into your daily RAG report.",
      },
    ],
  },
  {
    monthYear: "January 2026",
    sessions: [
      {
        id: "jan-1",
        type: "smart-alert",
        title:
          "SMART ALERT: Dr. Maliha Rahman was notified of your need for urgent care due to sustained cognitive fatigue patterns.",
        timestamp: "Jan 26, 2026 • 07:41 PM",
      },
      {
        id: "jan-2",
        type: "medication",
        title: "Medication & Hydration Reminder",
        timestamp: "Jan 16, 2026 • 04:22 PM",
        message:
          "Detected low sustained focus and reduced recovery markers. Maintain medication timing and hydrate now.",
      },
    ],
  },
  {
    monthYear: "December 2025",
    sessions: [
      {
        id: "dec-1",
        type: "appointment",
        title: "Reminder to schedule an appointment with Dr. Maliha Rahman.",
        timestamp: "Dec 11, 2025 • 10:03 AM",
        message:
          "Based on your biometric history and recent focus drops, the Featherless AI agent suggests a follow-up. Click here to schedule.",
      },
    ],
  },
];

const typeStyles: Record<SessionType, string> = {
  appointment: "border-purple-200 bg-white",
  medication: "border-indigo-200 bg-indigo-50/60",
  urgent:
    "border-purple-300 bg-gradient-to-br from-white via-purple-50 to-indigo-50",
  "smart-alert": "border-orange-200 bg-orange-50",
};

const typeLabelStyles: Record<SessionType, string> = {
  appointment: "bg-purple-100 text-purple-900 ring-purple-200",
  medication: "bg-indigo-100 text-indigo-900 ring-indigo-200",
  urgent: "bg-purple-100 text-purple-900 ring-purple-200",
  "smart-alert": "bg-orange-100 text-orange-900 ring-orange-200",
};

const typeLabels: Record<SessionType, string> = {
  appointment: "Appointment Reminder",
  medication: "Medication/Action Reminder",
  urgent: "Daily Check-In",
  "smart-alert": "Smart Alert Notification",
};

export default function AiSessionsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">
              Featherless Agent History
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
              AI Agent Sessions
            </h1>
            <p className="mt-3 max-w-3xl text-zinc-300">
              Chronological session log powered by premium Featherless.ai agent
              workflows, including reminders, triage interactions, and
              autonomous care escalation signals.
            </p>
          </div>

          <div className="space-y-10">
            {sessionGroups.map((group) => (
              <section key={group.monthYear}>
                <h2 className="mb-4 text-xl font-semibold text-white">
                  {group.monthYear}
                </h2>

                <div className="space-y-4">
                  {group.sessions.map((session) => (
                    <article
                      key={session.id}
                      className={`rounded-2xl border p-5 sm:p-6 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-26px_rgba(76,29,149,0.45)] ${typeStyles[session.type]}`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${typeLabelStyles[session.type]}`}
                        >
                          {typeLabels[session.type]}
                        </span>
                        <span className="text-xs font-medium text-zinc-500">
                          {session.timestamp}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                        {session.title}
                      </h3>

                      {session.message && (
                        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
                          {session.message}
                        </p>
                      )}

                      {session.type === "appointment" && (
                        <div className="mt-4">
                          <Link
                            href="/my-clinic"
                            className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                          >
                            Schedule Appointment
                          </Link>
                        </div>
                      )}

                      {session.type === "urgent" && (
                        <>
                          <div className="mt-4 rounded-xl border border-purple-200 bg-white/80 p-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-purple-800">
                              Transcript Preview
                            </p>
                            <p className="mt-2 text-sm text-zinc-700">
                              Agent: “{session.transcriptPreview}”
                            </p>
                          </div>

                          <p className="mt-3 text-sm leading-relaxed text-zinc-700">
                            {session.note}
                          </p>

                          <Link
                            href="/triage"
                            className="mt-4 inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                          >
                            Start Check-In
                          </Link>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
