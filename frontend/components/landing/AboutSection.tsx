"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const headlineOpacity = useTransform(
    scrollYProgress,
    [0.05, 0.2, 0.3],
    [0, 0.6, 1]
  );
  const imageOpacity = useTransform(
    scrollYProgress,
    [0.14, 0.28, 0.38],
    [0, 0.6, 1]
  );
  const textOpacity = useTransform(
    scrollYProgress,
    [0.2, 0.34, 0.44],
    [0, 0.6, 1]
  );

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative py-24 sm:py-32 px-4 bg-white overflow-hidden"
    >
      <div className="absolute top-8 right-8 text-[#2b1159]/30 text-2xl">*</div>
      <div className="max-w-6xl mx-auto">
        <motion.div
          style={{ opacity: headlineOpacity }}
          className="text-center mb-14"
        >
          <p className="text-[#2b1159] text-sm font-semibold tracking-widest uppercase mb-4">
            About NeuroSync
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-zinc-900">
            Clinical-grade
          </h2>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-zinc-900 mt-2">
            neurotechnology.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            style={{ opacity: imageOpacity }}
            className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100"
          >
            <Image
              src="/muse.png"
              alt="Neuron visualization"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>
          <motion.div style={{ opacity: textOpacity }}>
            <p className="text-zinc-600 text-lg md:text-xl leading-relaxed">
              NeuroSync is a closed-loop BCI platform engineered as an external executive-function
              layer for knowledge workers, students, and neurodivergent users. By combining
              high-frequency biosignal acquisition, edge processing, deep learning models, and
              agentic AI control, we deliver continuous ADHD-aware support that protects focus,
              reduces cognitive overload, and turns daily performance into a measurable system.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
