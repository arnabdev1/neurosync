import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/"
          className="text-xl font-bold flex items-center gap-2 text-zinc-900"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#2b1159] text-white">
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
        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <Link href="/about" className="hover:text-zinc-900 transition-colors">
            About
          </Link>
          <Link href="/login" className="hover:text-zinc-900 transition-colors">
            Login
          </Link>
          <Link href="/signup" className="hover:text-zinc-900 transition-colors">
            Sign up
          </Link>
        </div>
      </div>
      <p className="max-w-6xl mx-auto mt-6 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} NeuroSync. Zero-Latency Actuation • Predictive Burnout
        Modeling • 1D-CNN Pattern Recognition • Automated Executive Function • RAG-Powered
        Cognitive Journals.
      </p>
    </footer>
  );
}
