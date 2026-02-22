"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";

export default function ScrollRevealSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const headlineOpacity = useTransform(
    scrollYProgress,
    [0.05, 0.2, 0.28],
    [0, 0.6, 1]
  );
  const col1Opacity = useTransform(
    scrollYProgress,
    [0.12, 0.26, 0.34],
    [0, 0.6, 1]
  );
  const col2Opacity = useTransform(
    scrollYProgress,
    [0.2, 0.34, 0.42],
    [0, 0.6, 1]
  );
  const col3Opacity = useTransform(
    scrollYProgress,
    [0.28, 0.42, 0.5],
    [0, 0.6, 1]
  );

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 px-4 bg-white overflow-hidden"
    >
      <div className="absolute top-8 right-8 text-[#2b1159]/30 text-2xl">*</div>
      <div className="max-w-6xl mx-auto">
        <motion.div
          style={{ opacity: headlineOpacity }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-zinc-900">
            The broken loop
          </h2>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-zinc-900 mt-2">
            in cognitive control.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12">
          <motion.div style={{ opacity: col1Opacity }} className="space-y-4">
            <h3 className="text-xl font-bold text-zinc-900">Invisible Burnout</h3>
            <p className="text-zinc-600 leading-relaxed">
              Cognitive load rises silently across the day, but the brain has no visible fuel gauge.
              By the time fatigue is felt, neural efficiency has already dropped and the crash is
              underway.
            </p>
          </motion.div>
          <motion.div style={{ opacity: col2Opacity }} className="space-y-4">
            <h3 className="text-xl font-bold text-zinc-900">Lagging Indicators</h3>
            <p className="text-zinc-600 leading-relaxed">
              Screen-time dashboards, journals, and manual check-ins report what already happened.
              They fail in high-pressure moments because feedback arrives after focus is lost,
              context has shifted, and intervention is late.
            </p>
          </motion.div>
          <motion.div style={{ opacity: col3Opacity }} className="space-y-4">
            <h3 className="text-xl font-bold text-zinc-900">Executive Dysfunction</h3>
            <p className="text-zinc-600 leading-relaxed">
              Realizing you are distracted and forcing yourself back to task requires executive
              function, the same biological resource depleted by stress. This catch-22 is the core
              failure mode in ADHD and modern knowledge work.
            </p>
          </motion.div>
        </div>

        <motion.div
          style={{ opacity: col3Opacity }}
          className="mt-12 text-center"
        >
          <Link
            href="/signup"
            className="inline-flex rounded-lg bg-[#2b1159] px-6 py-3 text-white hover:bg-[#3a1b78] transition-colors"
          >
            Break the loop
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
