"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { isLoggedIn, logout } = useAuth();
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY <= 10) {
        setIsVisible(true);
      } else if (currentY > lastScrollY.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentY;

      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 150);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, []);

  const navLinkClass = "text-sm font-medium text-zinc-600 hover:text-white transition-colors";
  const isActive = (href: string) => pathname === href;
  const getLinkClass = (href: string) =>
    `${navLinkClass} ${isActive(href) ? "text-white" : ""}`;
  const navSurfaceFillClass = "fill-black/45";

  if (pathname?.startsWith("/login") || pathname?.startsWith("/signup")) {
    return null;
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-16 pointer-events-none">
        <svg viewBox="0 0 1000 64" preserveAspectRatio="none" className="h-full w-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
          <path
            d="M0 0H1000V64H730Q655 64 620 38Q602 24 570 24H430Q398 24 380 38Q345 64 270 64H0Z"
            className={navSurfaceFillClass}
          />
        </svg>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <Link
            href="/"
            className={`text-xl font-bold flex items-center gap-2 ${
              isLanding ? "text-white" : "text-white"
            }`}
          >
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md overflow-hidden">
              <Image src="/neurosync-logo.svg" alt="NeuroSync logo" fill className="object-cover" />
            </span>
            <span>
              Neuro<span className="text-purple-300">Sync</span>
            </span>
          </Link>

          <div className="flex items-center gap-8">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className={getLinkClass("/dashboard")}
                >
                  Dashboard
                </Link>
                <Link href="/ai-sessions" className={getLinkClass("/ai-sessions")}>
                  AI Agent Sessions
                </Link>
                <Link href="/my-clinic" className={getLinkClass("/my-clinic")}>
                  My Clinic
                </Link>
                <Link href="/agent-chat" className={getLinkClass("/agent-chat")}>
                  AI Agent Chat
                </Link>
                <Link href="/about" className={navLinkClass}>
                  About Us
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-zinc-600 hover:text-white transition-colors"
                >
                  LogOut
                </button>
              </>
            ) : (
              <>
                <Link href="/about" className={navLinkClass}>
                  About us
                </Link>
                <Link
                  href="/login"
                  className={`text-sm font-medium text-zinc-600 hover:text-white transition-colors ${
                    pathname === "/login" ? "text-white" : ""
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className={`text-sm font-medium text-zinc-600 hover:text-white transition-colors ${
                    pathname === "/signup" ? "text-white" : ""
                  }`}
                >
                  Signup
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
