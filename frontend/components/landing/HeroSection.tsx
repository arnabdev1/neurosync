"use client";

import { useState } from "react";

export default function HeroSection() {
  const [videoError, setVideoError] = useState(false);
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {!videoError && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setVideoError(true)}
        >
          <source src="/brainbg.mp4" type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight">
          From neural signals to life-changing impact.
        </h1>
        <div className="mt-8 max-w-3xl mx-auto text-sm sm:text-base text-zinc-200/95 leading-relaxed tracking-wide">
          <p>
            NeuroSync is the world&apos;s first Autonomous Cognitive Orthotic System, built to
            support ADHD and high-cognitive-load work by converting live EEG and PPG signals into
            real-time, actionable control.
          </p>
          <p className="mt-3">
            Our agentic AI continuously adapts your digital and physical workspace to your biology,
            so focus is stabilized before distraction and burnout take over.
          </p>
        </div>
      </div>
    </section>
  );
}
