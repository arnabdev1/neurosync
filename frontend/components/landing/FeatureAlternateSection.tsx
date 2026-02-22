"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent, type MotionValue } from "framer-motion";

const features = [
  {
    label: "Classification Engine",
    title: "Cognitive State Classification (1D-CNN)",
    description:
      "Our Hybrid ML pipeline processes a 5-second sliding window of spectral features extracted from raw EEG, including Alpha, Beta, Theta, and Gamma band power densities. A custom 1D Convolutional Neural Network performs temporal pattern recognition to classify cognitive state into Deep Work, Flow, Stress, and Scattered zones, mapping the mind in real time for precise ADHD-aware intervention.",
    imageLeft: true,
    image: "/1.png",
  },
  {
    label: "Autonomous Actuation",
    title: "Autonomous Actuation (Agentic AI)",
    description:
      "A LangGraph-powered Agentic Controller cross-references biological state data with digital context such as active windows and calendar intent to autonomously modify the environment. It adjusts IoT lighting, triggers haptics, blocks distracting applications, and adapts music context to guide the user back toward flow without conscious decision overhead.",
    imageLeft: false,
    image: "/2.png",
  },
  {
    label: "Predictive Intelligence",
    title: "Predictive Burnout & Memory (LSTM + RAG)",
    description:
      "An LSTM recurrent model analyzes 4-hour historical biosignal trends to predict focus crashes up to 30 minutes before onset, enabling preemptive intervention. At day-end, a Gemini 1.5 Pro LLM with retrieval-augmented generation (RAG) cross-references biological telemetry and calendar events to generate actionable Cognitive Reflection reports personalized for ADHD support.",
    imageLeft: true,
    image: "/3.png",
  },
];

function FeatureBlock({
  title,
  label,
  description,
  imageLeft,
  image,
  progress,
}: {
  title: string;
  label: string;
  description: string;
  imageLeft: boolean;
  image: string;
  progress: MotionValue<number>;
}) {
  const [opacity, setOpacity] = useState(0);
  useMotionValueEvent(progress, "change", setOpacity);
  return (
    <motion.div
      style={{ opacity }}
      className={`grid md:grid-cols-2 gap-12 items-center ${!imageLeft ? "md:direction-rtl" : ""}`}
    >
      <div className={imageLeft ? "" : "md:order-2"}>
        <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>
      <div className={imageLeft ? "" : "md:order-1"}>
        <p className="text-[#2b1159] text-sm font-semibold tracking-widest uppercase mb-3">
          {label}
        </p>
        <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-5 leading-tight">{title}</h3>
        <p className="text-zinc-600 text-base md:text-lg leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

export default function FeatureAlternateSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const p1 = useTransform(scrollYProgress, [0.08, 0.22, 0.3], [0, 0.7, 1]);
  const p2 = useTransform(scrollYProgress, [0.24, 0.38, 0.46], [0, 0.7, 1]);
  const p3 = useTransform(scrollYProgress, [0.4, 0.54, 0.62], [0, 0.7, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 px-4 bg-white"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#2b1159] text-sm font-semibold tracking-widest uppercase mb-4">
            The Technology
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900">
            Technical Deep Dive
          </h2>
        </div>
      </div>
      <div className="max-w-6xl mx-auto space-y-24">
        <FeatureBlock
          {...features[0]}
          progress={p1}
        />
        <FeatureBlock
          {...features[1]}
          progress={p2}
        />
        <FeatureBlock
          {...features[2]}
          progress={p3}
        />
      </div>
    </section>
  );
}
