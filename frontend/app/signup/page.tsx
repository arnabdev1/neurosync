"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5001/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, dob }),
      });

      const data = await response.json();

      if (data.success) {
        login(data.token, data.user);
      } else {
        setError(data.message || "Signup failed");
      }
    } catch (err) {
      setError("Network error. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold text-zinc-900"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#2b1159] text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8.5 7A3.5 3.5 0 0 1 12 3.5h.5A3.5 3.5 0 0 1 16 7v.2A3.8 3.8 0 0 1 18.8 11v2a3.8 3.8 0 0 1-2.8 3.7V17a3.5 3.5 0 0 1-3.5 3.5H12A3.5 3.5 0 0 1 8.5 17v-.3A3.8 3.8 0 0 1 5.7 13v-2a3.8 3.8 0 0 1 2.8-3.8Z" />
                <path d="M12.2 6.5v11" />
                <path d="M9.2 10.2h2" />
                <path d="M13.2 13.8h1.8" />
              </svg>
            </span>
            <span>
              Neuro<span className="text-purple-600">Sync</span>
            </span>
          </Link>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-8"
        >
          <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Sign up</h1>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-600 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg bg-white border border-zinc-200 px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-[#2b1159] focus:outline-none focus:ring-1 focus:ring-[#2b1159] transition-colors"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-600 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg bg-white border border-zinc-200 px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-[#2b1159] focus:outline-none focus:ring-1 focus:ring-[#2b1159] transition-colors"
              />
            </div>
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-zinc-600 mb-2">
                Date of Birth
              </label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className="w-full rounded-lg bg-white border border-zinc-200 px-4 py-3 text-zinc-900 focus:border-[#2b1159] focus:outline-none focus:ring-1 focus:ring-[#2b1159] transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[#2b1159] py-3 font-medium text-white hover:bg-[#3a1b78] transition-colors disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
          <p className="mt-4 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[#2b1159] hover:text-[#3a1b78]">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
