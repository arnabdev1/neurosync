"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";

export default function HardwareSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const rotate = useTransform(scrollYProgress, [0, 0.5, 1], [0, 2, -1]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1.32, 1.6]);
  const textOpacity = useTransform(
    scrollYProgress,
    [0.08, 0.22, 0.34],
    [0, 0.7, 1]
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[150vh] py-20 sm:py-28 overflow-hidden bg-white"
    >
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          ref={imageRef}
          style={{
            rotate,
            scale,
          }}
          className="relative mx-auto mb-12 h-[48vh] sm:h-[64vh] w-full"
        >
          <Image
            src="/muse.png"
            alt="Muse 2 Headband"
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </motion.div>

        <motion.div
          style={{ opacity: textOpacity }}
          className="text-center space-y-6"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900">
            Reads the mind. Secures the signal.
          </h2>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            NeuroSync streams real-time 256Hz EEG and PPG from the wearable headband into a local
            Edge Gateway powered by Raspberry Pi 5. The gateway acts as a secure low-latency bridge,
            preprocessing and routing biological telemetry to our centralized compute engine for
            autonomous intervention.
          </p>
          <Link
            href="/signup"
            className="inline-flex rounded-lg bg-[#2b1159] px-6 py-3 text-white hover:bg-[#3a1b78] transition-colors"
          >
            See hardware pipeline
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
