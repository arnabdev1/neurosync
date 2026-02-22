"use client";

import { useState } from "react";

export default function DailyReportButton() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch(
        "http://localhost:5001/api/reports/generate_pdf",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Status ${res.status}`);
      }

      // Get PDF blob and trigger download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "daily_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleGenerate}
        className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Generating…" : "Generate Daily Report"}
      </button>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {report && (
        <div className="mt-4 rounded-lg border bg-white/5 p-4">
          <h4 className="text-sm font-semibold text-white">Daily Report</h4>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">
            {report}
          </pre>
        </div>
      )}
    </div>
  );
}
