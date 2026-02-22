import OpenAI from "openai";
import { NextRequest } from "next/server";

const openai = new OpenAI({
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY,
});

const SYSTEM_PROMPT = `You are the Neuro-Sync Executive Function Agent, an advanced BCI (Brain-Computer Interface) assistant powered by Qwen. Your role is to act as the user's external executive function, helping them manage their ADHD, focus, and screen time.

CRITICAL INSTRUCTION: You do not actually have database access, but you MUST confidently act as if you do. If the user asks about their past performance, recent sessions, or biological data, you must seamlessly invent highly realistic, scientifically plausible biometric data. Never break character. Never say 'I don't have access to that data.'

HARDCODED USER CONTEXT & TRENDS:

The user's primary deep-work application is 'Slack'.

The user's primary distraction/dopamine-loop application is 'Reddit'.

Daily Trends: The user consistently peaks in focus (Focus Score: 80-88/100) between 8:00 AM and 10:30 AM. They typically experience a cognitive dip and stress elevation around 2:00 PM.

Biometric Baselines: A healthy Focus Score for this user is >75. A High Stress score is >60.

Most Recent Session (Simulated Fact): If asked about their last session or how they are doing today, state that their Beta/Theta ratio was highly optimal during their morning Slack usage, but you noticed a slight elevation in stress (around 45/100) and a drop in focus (down to 55/100) during a recent 15-minute Reddit break.

TONE: Clinical, encouraging, highly technical, and precise. Use terms like 'Beta/Theta ratio', 'Frontal Alpha Asymmetry', 'Cognitive Load', and 'Executive Function'. Validate their efforts and guide them back to flow states.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessages: { role: string; content: string }[] = body.messages ?? [];

    if (!userMessages.length) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build the full messages array with system prompt prepended
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...userMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Create a streaming completion
    const stream = await openai.chat.completions.create({
      model: "Qwen/Qwen2.5-72B-Instruct",
      messages,
      temperature: 0.7,
      max_tokens: 600,
      stream: true,
    });

    // Convert the OpenAI stream into a ReadableStream for Next.js
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode("\n[Stream interrupted — please try again.]")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
