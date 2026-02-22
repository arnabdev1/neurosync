import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY,
});

/* ── Stage 2 — Diagnostic Engine (DeepSeek-V3) ────────────────────────── */
const DIAGNOSTICIAN_PROMPT = `You are the Neuro-Sync Diagnostic Engine. Analyze the provided user chat transcript. Determine if the user's cognitive fatigue requires clinical escalation. Return ONLY a raw JSON object with no markdown formatting: { "escalate": boolean, "reason": "string explaining why" }. Flag 'true' if the user expresses overwhelming stress, inability to cope with their research/coding workload, or severe burnout.`;

/* ── Stage 3 — Scribe / Alert Generator (Llama-3.1-70B) ───────────────── */
const SCRIBE_PROMPT = `You are the Neuro-Sync Clinical Scribe. Based on the diagnostic assessment and the original triage transcript, draft a short, HIPAA-compliant email to the user's physician:

Physician: Dr. Maliha Rahman
Patient: Arnab
System: Neuro-Sync BCI Monitoring Platform

The email should:
1. State that Neuro-Sync's automated triage flagged the patient for potential cognitive fatigue escalation.
2. Summarize the key concern in 2-3 sentences (reference biometric + self-report evidence).
3. Recommend a follow-up appointment.
4. Close with a professional sign-off from "Neuro-Sync Autonomous Care System".

Return ONLY the email body text. Do not include subject line or headers.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript: { role: string; content: string }[] =
      body.messages ?? [];

    if (!transcript.length) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 }
      );
    }

    // ── Stage 2: Diagnostician ──────────────────────────────────────────
    const transcriptText = transcript
      .map((m) => `${m.role === "assistant" ? "Agent" : "User"}: ${m.content}`)
      .join("\n");

    const diagResponse = await openai.chat.completions.create({
      model: "deepseek-ai/DeepSeek-V3-0324",
      messages: [
        { role: "system", content: DIAGNOSTICIAN_PROMPT },
        {
          role: "user",
          content: `Here is the triage transcript:\n\n${transcriptText}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    const rawDiag = diagResponse.choices?.[0]?.message?.content?.trim() ?? "";

    let diagnosis: { escalate: boolean; reason: string };
    try {
      diagnosis = JSON.parse(rawDiag);
    } catch {
      // If the model wraps in markdown fences, strip them
      const cleaned = rawDiag
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .trim();
      try {
        diagnosis = JSON.parse(cleaned);
      } catch {
        diagnosis = { escalate: false, reason: rawDiag };
      }
    }

    // ── Stage 3: Scribe (only if escalation needed) ─────────────────────
    let alertEmail: string | null = null;

    if (diagnosis.escalate) {
      const scribeResponse = await openai.chat.completions.create({
        model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
        messages: [
          { role: "system", content: SCRIBE_PROMPT },
          {
            role: "user",
            content: `Diagnostic assessment:\n${JSON.stringify(diagnosis)}\n\nOriginal triage transcript:\n${transcriptText}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 500,
      });

      alertEmail =
        scribeResponse.choices?.[0]?.message?.content?.trim() ?? null;
    }

    return NextResponse.json({
      escalate: diagnosis.escalate,
      reason: diagnosis.reason,
      alertEmail,
    });
  } catch (err: unknown) {
    console.error("Triage analyze error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
