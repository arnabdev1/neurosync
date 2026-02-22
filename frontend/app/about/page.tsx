"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/landing/Footer";

const team = [
  { name: "Neural Engineering", desc: "EEG signal processing & edge compute" },
  { name: "Machine Learning", desc: "1D-CNN, LSTM & cognitive classification" },
  { name: "Agentic AI", desc: "LangGraph autonomous environment control" },
  { name: "Biomedical Research", desc: "Neuroscience & executive function" },
];

const timeline = [
  {
    phase: "Phase 1",
    title: "Signal Acquisition",
    desc: "Real-time 256Hz EEG/PPG streaming via Muse 2 to Raspberry Pi 5 Edge Gateway.",
  },
  {
    phase: "Phase 2",
    title: "Cognitive Classification",
    desc: "1D-CNN processes spectral features to classify Deep Work, Flow, Stress, Scattered states.",
  },
  {
    phase: "Phase 3",
    title: "Autonomous Actuation",
    desc: "LangGraph agent modifies lights, audio, apps & environment based on biological state.",
  },
  {
    phase: "Phase 4",
    title: "Predictive Intelligence",
    desc: "LSTM burnout prediction & RAG-powered daily cognitive reflection journals.",
  },
];

const coreTech = [
  "EEG/PPG Biosignals",
  "1D-CNN Classification",
  "LangGraph Agents",
  "LSTM Prediction",
  "Edge Computing",
  "Local-First Privacy",
];

function DotIcon() {
  return <span className="h-2.5 w-2.5 rounded-full bg-[#2b1159]" aria-hidden />;
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Navbar />
      <main className="pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-[#2b1159] text-sm font-semibold tracking-widest uppercase mb-4">
              About
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-zinc-900">About NeuroSync</h1>
            <p className="text-zinc-600 text-lg max-w-3xl mx-auto leading-relaxed mt-6">
              NeuroSync is a Closed-Loop Brain-Computer Interface system designed to function as an
              external Executive Function processor for knowledge workers, students, and
              neurodivergent individuals. We read your biology, then autonomously adapt your world.
            </p>
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 md:p-10 mb-12"
          >
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Our Mission</h2>
            <p className="text-zinc-600 leading-relaxed">
              The modern knowledge worker loses an average of 2.1 hours per day to involuntary
              focus fragmentation. Current solutions like productivity apps and reminders share one
              fatal flaw: they depend on already-depleted Executive Function. NeuroSync removes this
              dependency by creating an autonomous cognitive orthotic that reads, classifies,
              predicts, and actuates without requiring constant self-regulation.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-zinc-900 mb-6 text-center">Technical Pipeline</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {timeline.map((item) => (
                <div key={item.title} className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-[#2b1159] text-xs font-semibold tracking-widest uppercase">
                    {item.phase}
                  </p>
                  <h3 className="text-lg font-semibold text-zinc-900 mt-2 mb-2">{item.title}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-zinc-900 mb-6 text-center">Core Technologies</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {coreTech.map((tech) => (
                <div key={tech} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
                  <DotIcon />
                  <span className="text-sm font-medium text-zinc-800">{tech}</span>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-14"
          >
            <h2 className="text-2xl font-bold text-zinc-900 mb-6 text-center">Research Domains</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {team.map((member) => (
                <div key={member.name} className="rounded-xl border border-zinc-200 bg-white p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#2b1159]/10 flex items-center justify-center mx-auto mb-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#2b1159]" aria-hidden />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">{member.name}</h3>
                  <p className="text-xs text-zinc-600">{member.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center"
          >
            <p className="text-zinc-600 text-sm mb-4">Ready to let your biology drive your productivity?</p>
            <Link
              href="/signup"
              className="inline-block rounded-full bg-[#2b1159] px-8 py-3 text-sm font-semibold text-white hover:bg-[#3a1b78] transition-colors"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
