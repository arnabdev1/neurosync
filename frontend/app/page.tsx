"use client";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ScrollRevealSection from "@/components/landing/ScrollRevealSection";
import HardwareSection from "@/components/landing/HardwareSection";
import FeatureAlternateSection from "@/components/landing/FeatureAlternateSection";
import AboutSection from "@/components/landing/AboutSection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Navbar />
      <main className="page-enter">
        <HeroSection />
        <ScrollRevealSection />
        <HardwareSection />
        <FeatureAlternateSection />
        <AboutSection />
        <Footer />
      </main>
    </div>
  );
}
