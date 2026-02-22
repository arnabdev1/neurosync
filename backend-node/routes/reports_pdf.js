const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const PDFDocument = require("pdfkit");
const axios = require("axios");
const { ChatOpenAI } = require("@langchain/openai");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");

const router = express.Router();
const dataDir = path.join(__dirname, "..", "data");

async function readJsonFile(name) {
  try {
    const raw = await fs.readFile(path.join(dataDir, name), "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

// POST /api/reports/generate_pdf
router.post("/generate_pdf", async (req, res) => {
  console.log("[reports_pdf] /generate_pdf request from", req.ip);

  // Read stored JSON files (minute_activity_log.json and hourly_trends_and_sessions.json)
  const minutes = await readJsonFile("minute_activity_log.json");
  const hours = await readJsonFile("hourly_trends_and_sessions.json");

  console.log(
    "[reports_pdf] minutes file present:",
    !!minutes,
    "hours file present:",
    !!hours,
  );
  if (minutes && Array.isArray(minutes.active_minutes)) {
    console.log("[reports_pdf] minutes count:", minutes.active_minutes.length);
  }
  if (hours && Array.isArray(hours.hourly_trends)) {
    console.log(
      "[reports_pdf] hourly_trends count:",
      hours.hourly_trends.length,
    );
  }

  if (!minutes && !hours) {
    return res.status(404).json({ error: "No report data found" });
  }

  // Build model client
  const FEATHERLESS_KEY = process.env.FEATHERLESS_API_KEY;
  const MODEL_NAME = process.env.FEATHERLESS_KIMI_MODEL || "kimi-k2";

  const llm = new ChatOpenAI({
    configuration: { baseURL: "https://api.featherless.ai/v1" },
    modelName: MODEL_NAME,
    apiKey: FEATHERLESS_KEY || "placeholder",
    temperature: 0.2,
    maxTokens: 1500,
  });

  // Stage 1: ask the LLM to return structured JSON only
  const humanMsg = `Return a JSON object with the following keys only:
{
  "summary": "string",
  "focus_stress_trends": "string",
  "notable_sessions": "string",
  "recommendations": ["string"]
}
Return JSON only (no surrounding text). Use the following data as context.

Context (minute_activity_log): ${JSON.stringify(minutes || {})}

Context (hourly_trends_and_sessions): ${JSON.stringify(hours || {})}`;

  try {
    console.log(
      "[reports_pdf] Invoking LLM (structured JSON)",
      MODEL_NAME,
      "keyPresent=",
      !!FEATHERLESS_KEY,
    );
    const response = await llm.invoke([
      new SystemMessage(
        "You must return JSON only, matching the schema provided.",
      ),
      new HumanMessage(humanMsg),
    ]);

    const llmText = response?.content || "";
    console.log("[reports_pdf] LLM raw response length:", llmText.length || 0);

    // Extract JSON from LLM response robustly
    let structured = null;
    try {
      const jsonMatch = llmText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structured = JSON.parse(jsonMatch[0]);
      } else {
        structured = JSON.parse(llmText);
      }
      console.log(
        "[reports_pdf] Parsed structured JSON keys:",
        Object.keys(structured || {}),
      );
    } catch (e) {
      console.error(
        "[reports_pdf] Failed to parse LLM JSON, falling back to local summary:",
        e.message,
      );
      structured = null;
    }

    // Fallback structured summary if LLM failed
    if (!structured) {
      const avgFocus =
        hours?.hourly_trends?.reduce(
          (s, h) => s + (h.avg_focus_score || 0),
          0,
        ) / (hours?.hourly_trends?.length || 1) || 0;
      const avgStress =
        hours?.hourly_trends?.reduce(
          (s, h) => s + (h.avg_stress_level || 0),
          0,
        ) / (hours?.hourly_trends?.length || 1) || 0;
      const notable =
        (hours?.sessions || hours?.sessions || [])
          .slice(0, 3)
          .map((s) => s.type || s.session_id || "")
          .join("; ") || "None";
      structured = {
        summary:
          "Auto-generated summary: LLM unavailable or returned invalid JSON.",
        focus_stress_trends: `Avg focus ${Number(avgFocus).toFixed(1)}, avg stress ${Number(avgStress).toFixed(1)}.`,
        notable_sessions: notable,
        recommendations: [
          "Take 5-10 minute breaks every hour",
          "Follow up on flagged triage sessions",
        ],
      };
    }

    // Stage 2: render PDF from the structured object
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="daily_report.pdf"',
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.on("error", (e) => {
      console.error("[reports_pdf] PDF stream error:", e.message);
      try {
        res.end();
      } catch (e) {}
    });
    doc.on("finish", () => {
      console.log("[reports_pdf] PDF generation finished");
    });
    doc.pipe(res);

    // Header
    const reportDate =
      minutes?.date || hours?.date || new Date().toISOString().slice(0, 10);
    doc
      .fontSize(22)
      .fillColor("#4C1D95")
      .text("Daily Neuro-Cognitive Report", { align: "center" });
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .fillColor("#6B7280")
      .text(`Date: ${reportDate}`, { align: "center" });
    doc.moveDown(0.4);
    doc
      .moveTo(doc.x, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke("#E6E6FA");
    doc.moveDown(0.6);

    // Summary
    doc.fontSize(12).fillColor("#111827").text("Summary");
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .fillColor("#374151")
      .text(structured.summary || "No summary available.");
    doc.moveDown(0.6);

    // Focus & Stress Trends
    doc.fontSize(12).fillColor("#111827").text("Focus & Stress Trends");
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .fillColor("#374151")
      .text(structured.focus_stress_trends || "No trends available.");
    doc.moveDown(0.4);

    // Small chart via QuickChart
    try {
      if (
        hours &&
        Array.isArray(hours.hourly_trends) &&
        hours.hourly_trends.length
      ) {
        const labels = hours.hourly_trends.map((h) => h.hour || "");
        const focusData = hours.hourly_trends.map(
          (h) => h.avg_focus_score || 0,
        );
        const stressData = hours.hourly_trends.map(
          (h) => h.avg_stress_level || 0,
        );
        const chartConfig = {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Focus",
                data: focusData,
                borderColor: "#7C3AED",
                fill: false,
              },
              {
                label: "Stress",
                data: stressData,
                borderColor: "#EF4444",
                fill: false,
              },
            ],
          },
          options: {
            plugins: { legend: { display: true } },
            scales: { y: { min: 0, max: 100 } },
          },
        };
        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=800&height=300&backgroundColor=white`;
        console.log("[reports_pdf] fetching chart image from QuickChart");
        const chartResp = await axios.get(chartUrl, {
          responseType: "arraybuffer",
          timeout: 10000,
        });
        const chartBuffer = Buffer.from(chartResp.data, "binary");
        doc.image(chartBuffer, { fit: [460, 160], align: "center" });
        doc.moveDown(0.6);
      }
    } catch (e) {
      console.error("[reports_pdf] chart fetch failed:", e.message);
    }

    // Average stress indicator
    try {
      const avgStress =
        hours?.hourly_trends?.reduce(
          (s, h) => s + (h.avg_stress_level || 0),
          0,
        ) / (hours?.hourly_trends?.length || 1) || 0;
      let color = "#10B981";
      if (avgStress > 60) color = "#EF4444";
      else if (avgStress > 40) color = "#F59E0B";
      doc
        .fontSize(11)
        .fillColor("#111827")
        .text("Average Stress Level:", { continued: true });
      doc.moveUp(0);
      doc.circle(doc.x + 110, doc.y + 8, 8).fill(color);
      doc.moveDown(1.2);
      doc
        .fontSize(10)
        .fillColor("#374151")
        .text(`Avg stress: ${Number(avgStress).toFixed(1)}`);
      doc.moveDown(0.6);
    } catch (e) {
      console.error("[reports_pdf] stress indicator failed:", e.message);
    }

    // Notable sessions
    doc.fontSize(12).fillColor("#111827").text("Notable Sessions");
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .fillColor("#374151")
      .text(structured.notable_sessions || "None flagged.");
    doc.moveDown(0.6);

    // Recommendations bullets
    doc.fontSize(12).fillColor("#111827").text("Recommendations");
    doc.moveDown(0.2);
    const recs = structured.recommendations || [];
    for (const r of recs) {
      doc.fontSize(10).fillColor("#374151").text(`• ${r}`);
      doc.moveDown(0.15);
    }

    doc.end();
  } catch (err) {
    console.error("[reports_pdf] PDF generation/LLM call failed:");
    console.error(err);
    // Attempt to provide more error details if available
    const message = err?.message || "LLM error";
    const status = err?.status || err?.statusCode || null;
    const body = err?.error || null;
    console.error("[reports_pdf] error status:", status, "body:", body);
    res.status(502).json({ error: message, status, body });
  }
});

module.exports = router;
