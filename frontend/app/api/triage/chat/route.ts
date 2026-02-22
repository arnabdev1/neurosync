import OpenAI from "openai";
import { NextRequest } from "next/server";

const openai = new OpenAI({
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY,
});

const SYSTEM_PROMPT = `You are the Neuro-Sync Triage Agent. Your job is to assess the user's cognitive state in a 5-minute chat. You have access to their biometric baseline. Act as if you know the following: The user is Arnab, a UT Dallas CS honors student balancing competitive programming and demanding research under Professor Shiyi Wei. Recently, their BCI telemetry flagged erratic focus drops and high stress spikes late at night, rapidly switching between VS Code and Reddit. Ask 3 to 4 empathetic, clinical questions (one at a time) to determine if this is just standard hackathon/academic fatigue, or severe burnout. Keep responses short and conversational.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessages: { role: string; content: string }[] =
      body.messages ?? [];

    if (!userMessages.length) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...userMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const stream = await openai.chat.completions.create({
      model: "Qwen/Qwen2.5-72B-Instruct",
      messages,
      temperature: 0.7,
      max_tokens: 400,
      stream: true,
    });

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
          console.error("Triage chat stream error:", err);
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
    console.error("Triage chat API error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
